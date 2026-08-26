from __future__ import annotations

import importlib.util
import io
import json
import math
import re
import shutil
import tempfile
import zipfile
from collections import defaultdict
from pathlib import Path

import py7zr

BASE_PATH = Path(__file__).with_name('build-generations-starters-web.py')
BASE_SPEC = importlib.util.spec_from_file_location('starter_builder', BASE_PATH)
if BASE_SPEC is None or BASE_SPEC.loader is None:
    raise RuntimeError('Unable to load starter builder helpers')
BASE = importlib.util.module_from_spec(BASE_SPEC)
BASE_SPEC.loader.exec_module(BASE)

AUDIT_PATH = Path(__file__).with_name('audit-generations-gen1-3.py')
AUDIT_SPEC = importlib.util.spec_from_file_location('generations_audit', AUDIT_PATH)
if AUDIT_SPEC is None or AUDIT_SPEC.loader is None:
    raise RuntimeError('Unable to load audit helpers')
AUDIT = importlib.util.module_from_spec(AUDIT_SPEC)
AUDIT_SPEC.loader.exec_module(AUDIT)

SEMANTIC_PATH = Path(__file__).with_name('audit-generations-semantic.py')
SEMANTIC_SPEC = importlib.util.spec_from_file_location('generations_semantic', SEMANTIC_PATH)
if SEMANTIC_SPEC is None or SEMANTIC_SPEC.loader is None:
    raise RuntimeError('Unable to load semantic helpers')
SEMANTIC = importlib.util.module_from_spec(SEMANTIC_SPEC)
SEMANTIC_SPEC.loader.exec_module(SEMANTIC)

MODEL_ROOT = 'assets/generations_core/bedrock/pokemon/models/'
POSER_ROOT = 'assets/generations_core/bedrock/pokemon/posers/'
OUTPUT_ROOT = Path('public/research/generations')
SAMPLES = (
    {'slug': 'bulbasaur', 'dex': 1, 'generation': 1},
    {'slug': 'charmander', 'dex': 4, 'generation': 1},
    {'slug': 'squirtle', 'dex': 7, 'generation': 1},
    {'slug': 'caterpie', 'dex': 10, 'generation': 1},
    {'slug': 'ledyba', 'dex': 165, 'generation': 2},
    {'slug': 'rayquaza', 'dex': 384, 'generation': 3},
)


def quat_zyx(x: float, y: float, z: float) -> list[float]:
    hx = x * 0.5
    hy = y * 0.5
    hz = z * 0.5
    sx, cx = math.sin(hx), math.cos(hx)
    sy, cy = math.sin(hy), math.cos(hy)
    sz, cz = math.sin(hz), math.cos(hz)
    return [
        cz * cy * sx - sz * sy * cx,
        cz * sy * cx + sz * cy * sx,
        sz * cy * cx - cz * sy * sx,
        cz * cy * cx + sz * sy * sx,
    ]


def build_smd_animation(path: Path, name: str) -> dict:
    lines = [line.strip() for line in path.read_text('utf-8', errors='replace').splitlines()]
    node_names: dict[int, str] = {}
    positions: dict[str, list[tuple[int, list[float]]]] = defaultdict(list)
    rotations: dict[str, list[tuple[int, list[float]]]] = defaultdict(list)
    section = None
    current_time = 0
    max_frame = 0

    node_line = re.compile(r'^(\d+)\s+"([^"]+)"\s+-?\d+$')
    for line in lines:
        if not line:
            continue
        if line in {'version 1', 'version 2'}:
            continue
        if line == 'nodes':
            section = 'nodes'
            continue
        if line == 'skeleton':
            section = 'skeleton'
            continue
        if line == 'end':
            section = None
            continue
        if section == 'nodes':
            match = node_line.match(line)
            if match:
                node_names[int(match.group(1))] = match.group(2)
            continue
        if section != 'skeleton':
            continue
        if line.startswith('time '):
            current_time = int(line.split()[1])
            max_frame = max(max_frame, current_time)
            continue
        parts = line.split()
        if len(parts) < 7:
            continue
        try:
            bone_id = int(parts[0])
            values = [float(value) for value in parts[1:7]]
        except ValueError:
            continue
        bone_name = node_names.get(bone_id)
        if not bone_name:
            continue
        px, py, pz, rx, ry, rz = values
        positions[bone_name].append((current_time, [px, py, pz]))
        rotations[bone_name].append((current_time, quat_zyx(rx, ry, rz)))

    fps = 30
    key_frames = max_frame + 1
    tracks = []
    for bone_name in sorted(set(positions) | set(rotations)):
        item = {'name': bone_name}
        pos_keys = positions.get(bone_name, [])
        rot_keys = rotations.get(bone_name, [])
        if pos_keys:
            item['position'] = {
                'times': [frame / fps for frame, _ in pos_keys],
                'values': [component for _, value in pos_keys for component in value],
            }
        if rot_keys:
            item['rotation'] = {
                'times': [frame / fps for frame, _ in rot_keys],
                'values': [component for _, value in rot_keys for component in value],
            }
        tracks.append(item)

    if not tracks:
        raise RuntimeError(f'{path.name}: SMD contains no animation tracks')
    return {
        'name': name,
        'loop': True,
        'fps': fps,
        'keyFrames': key_frames,
        'duration': max(max_frame / fps, 1 / fps),
        'tracks': tracks,
    }


def build_motion(path: Path, name: str) -> dict:
    suffix = path.suffix.lower()
    if suffix in {'.tranm', '.gfbanm'}:
        motion = BASE.build_animation(path, name)
        motion['loop'] = True
        return motion
    if suffix == '.smd':
        return build_smd_animation(path, name)
    raise RuntimeError(f'Unsupported animation format: {path.name}')


def archive_for(generation: int) -> tuple[dict, zipfile.ZipFile]:
    metadata = AUDIT.latest_pack(generation)
    path = AUDIT.download_pack(generation, metadata)
    return metadata, zipfile.ZipFile(path)


def extract_pk(archive: zipfile.ZipFile, slug: str, destination: Path) -> tuple[bytes, set[str]]:
    entry = f'{MODEL_ROOT}{slug}.pk'
    payload = archive.read(entry)
    with py7zr.SevenZipFile(io.BytesIO(payload), mode='r') as seven:
        names = {name for name in seven.getnames() if name and name.strip()}
        seven.extract(path=destination, targets=sorted(names))
    return payload, names


def load_poser(archive: zipfile.ZipFile, slug: str) -> dict:
    return json.loads(archive.read(f'{POSER_ROOT}{slug}.json').decode('utf-8'))


def build_species(archive: zipfile.ZipFile, metadata: dict, sample: dict) -> dict:
    slug = sample['slug']
    output = OUTPUT_ROOT / slug
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    with tempfile.TemporaryDirectory(prefix=f'{slug}-semantic-') as tmp:
        extracted = Path(tmp)
        pk_payload, names = extract_pk(archive, slug, extracted)
        poser = load_poser(archive, slug)
        idle_pose, idle_stem = SEMANTIC.choose_idle(poser)
        idle_name = SEMANTIC.find_resource(names, idle_stem)
        model_name = SEMANTIC.choose_glb(names, slug)
        if not idle_name or not model_name:
            raise RuntimeError(f'{slug}: semantic assets missing model={model_name} idle={idle_name}')

        config = json.loads((extracted / 'config.json').read_text('utf-8'))
        model_source = extracted / model_name
        model_bytes = model_source.read_bytes()
        document = BASE.glb_document(model_bytes)
        node_names = {node.get('name') for node in document.get('nodes', []) if node.get('name')}
        shutil.copy2(model_source, output / 'model.glb')

        materials = config.get('materials') or {}
        default_variant = config.get('defaultVariant') or {}
        baked_cache: dict[str, dict] = {}
        mesh_bindings: dict[str, dict] = {}
        missing_materials = []
        for mesh_name, mesh_config in default_variant.items():
            if mesh_config.get('hide'):
                continue
            material_name = mesh_config.get('material')
            material = materials.get(material_name)
            if not material_name or material is None:
                missing_materials.append(mesh_name)
                continue
            if material_name not in baked_cache:
                baked_cache[material_name] = BASE.bake_material(
                    extracted, material_name, material, output
                )
            mesh_bindings[mesh_name] = baked_cache[material_name]

        idle = build_motion(extracted / idle_name, 'idle')
        animations = {'idle': idle}
        missing_animation_nodes = sorted(
            {
                track['name']
                for track in idle['tracks']
                if track['name'] not in node_names
            }
        )

        payload = {
            'provider': 'Generations x Cobblemon',
            'providerVersion': metadata.get('number') or metadata.get('name'),
            'species': slug,
            'dex': sample['dex'],
            'scale': float(config.get('scale', 1.0)),
            'model': 'model.glb',
            'materials': mesh_bindings,
            'animations': animations,
            'missingAnimationNodes': missing_animation_nodes,
            'missingMaterials': missing_materials,
            'source': {
                'generationPack': sample['generation'],
                'modelFile': model_name,
                'idlePose': idle_pose,
                'idleFile': idle_name,
            },
        }
        (output / 'asset.json').write_text(json.dumps(payload, separators=(',', ':')), 'utf-8')
        return {
            'species': slug,
            'dex': sample['dex'],
            'modelFile': model_name,
            'idleFile': idle_name,
            'pkBytes': len(pk_payload),
            'modelBytes': len(model_bytes),
            'assetJsonBytes': (output / 'asset.json').stat().st_size,
            'idleTracks': len(idle['tracks']),
            'missingAnimationNodes': missing_animation_nodes,
            'missingMaterials': missing_materials,
        }


def main() -> None:
    if BASE.DRACO_OUTPUT.exists():
        shutil.rmtree(BASE.DRACO_OUTPUT)
    shutil.copytree(BASE.DRACO_SOURCE, BASE.DRACO_OUTPUT)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    packs: dict[int, tuple[dict, zipfile.ZipFile]] = {}
    reports = []
    try:
        for sample in SAMPLES:
            generation = sample['generation']
            if generation not in packs:
                packs[generation] = archive_for(generation)
            metadata, archive = packs[generation]
            reports.append(build_species(archive, metadata, sample))
    finally:
        for _, archive in packs.values():
            archive.close()

    print('GENERATIONS_FORMAT_SAMPLES', json.dumps(reports, ensure_ascii=False))
    failures = [
        report
        for report in reports
        if report['missingAnimationNodes'] or report['missingMaterials']
    ]
    if failures:
        raise RuntimeError(f'Format samples failed validation: {json.dumps(failures)}')


if __name__ == '__main__':
    main()
