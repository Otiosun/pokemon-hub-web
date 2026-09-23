from __future__ import annotations

import io
import json
import re
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

import py7zr

TEMP_ROOT = Path(tempfile.gettempdir())
IMPORTER = TEMP_ROOT / 'poke-importer'
if str(IMPORTER) not in sys.path:
    sys.path.insert(0, str(IMPORTER))

from GFLib.Anim.Animation import AnimationT

PROJECTS = {
    1: 'generation-1-(generations)',
    2: 'generation-2-(generations)',
    3: 'generation-3-(generations)',
}
RANGES = {
    1: range(1, 152),
    2: range(152, 252),
    3: range(252, 387),
}
MODEL_ROOT = 'assets/generations_core/bedrock/pokemon/models/'
REPORT_PATH = Path('public/research/generations/coverage-report.json')
POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon-species?limit=386&offset=0'


def request(url: str):
    return urllib.request.Request(url, headers={'User-Agent': 'PokemonHubCoverageAudit/0.1'})


def get_json(url: str):
    with urllib.request.urlopen(request(url), timeout=45) as response:
        return json.load(response)


def normalize(value: str) -> str:
    return re.sub(r'[^a-z0-9]', '', value.lower())


def expected_species() -> dict[int, str]:
    payload = get_json(POKEAPI_URL)
    result: dict[int, str] = {}
    for item in payload.get('results', []):
        url = item.get('url', '').rstrip('/')
        try:
            dex = int(url.rsplit('/', 1)[-1])
        except ValueError:
            continue
        if 1 <= dex <= 386:
            result[dex] = item['name']
    if len(result) != 386:
        raise RuntimeError(f'PokéAPI species list incomplete: {len(result)}/386')
    return result


def latest_pack(generation: int) -> dict:
    slug = urllib.parse.quote(PROJECTS[generation], safe='')
    versions = get_json(f'https://api.modrinth.com/v2/project/{slug}/version')
    usable = [version for version in versions if version.get('files')]
    if not usable:
        raise RuntimeError(f'Generation {generation}: no downloadable versions')
    usable.sort(key=lambda item: item.get('date_published', ''), reverse=True)
    version = usable[0]
    files = version['files']
    asset = next((item for item in files if item.get('primary')), files[0])
    return {
        'id': version['id'],
        'number': version.get('version_number'),
        'name': version.get('name'),
        'date': version.get('date_published'),
        'url': asset['url'],
        'filename': asset.get('filename'),
        'size': int(asset.get('size') or 0),
    }


def download_pack(generation: int, pack: dict) -> Path:
    path = TEMP_ROOT / f'generations-gen{generation}.zip'
    if path.exists() and (not pack['size'] or path.stat().st_size == pack['size']):
        return path
    if path.exists():
        path.unlink()
    with urllib.request.urlopen(request(pack['url']), timeout=120) as response, path.open('wb') as target:
        total = 0
        while True:
            chunk = response.read(2 * 1024 * 1024)
            if not chunk:
                break
            target.write(chunk)
            total += len(chunk)
    if pack['size'] and path.stat().st_size != pack['size']:
        raise RuntimeError(
            f"Generation {generation}: download mismatch {path.stat().st_size} != {pack['size']}"
        )
    return path


def glb_nodes(data: bytes) -> set[str]:
    if data[:4] != b'glTF':
        raise RuntimeError('model.glb is not GLB')
    json_length = int.from_bytes(data[12:16], 'little')
    chunk_type = int.from_bytes(data[16:20], 'little')
    if chunk_type != 0x4E4F534A:
        raise RuntimeError('first GLB chunk is not JSON')
    document = json.loads(data[20:20 + json_length].rstrip(b'\x00 \t\r\n').decode('utf-8'))
    return {node['name'] for node in document.get('nodes', []) if node.get('name')}


def animation_nodes(data: bytes) -> set[str]:
    animation = AnimationT.InitFromPackedBuf(bytearray(data), 0)
    if animation.info is None or animation.skeleton is None:
        raise RuntimeError('invalid TRANM')
    return {
        track.name
        for track in animation.skeleton.tracks or []
        if track is not None and getattr(track, 'name', None)
    }


def inspect_pk(payload: bytes) -> dict:
    required = {'model.glb', 'config.json', 'idle.tranm', 'glad.tranm'}
    with tempfile.TemporaryDirectory(prefix='pk-audit-') as tmp:
        destination = Path(tmp)
        with py7zr.SevenZipFile(io.BytesIO(payload), mode='r') as seven:
            names = {name for name in seven.getnames() if name and name.strip()}
            missing_files = sorted(required - names)
            targets = [name for name in names if name in required or name.lower().endswith(('.png', '.webp'))]
            seven.extract(path=destination, targets=targets)

        if missing_files:
            return {'ok': False, 'missingFiles': missing_files}

        config = json.loads((destination / 'config.json').read_text('utf-8'))
        materials = config.get('materials') or {}
        default_variant = config.get('defaultVariant') or {}
        missing_materials: list[str] = []
        missing_images: list[str] = []
        for mesh_name, mesh_config in default_variant.items():
            if mesh_config.get('hide'):
                continue
            material_name = mesh_config.get('material')
            material = materials.get(material_name)
            if not material_name or material is None:
                missing_materials.append(mesh_name)
                continue
            for image_name in (material.get('images') or {}).values():
                if image_name and not (destination / image_name).exists():
                    missing_images.append(image_name)

        nodes = glb_nodes((destination / 'model.glb').read_bytes())
        idle_nodes = animation_nodes((destination / 'idle.tranm').read_bytes())
        happy_nodes = animation_nodes((destination / 'glad.tranm').read_bytes())
        missing_idle_nodes = sorted(idle_nodes - nodes)
        missing_happy_nodes = sorted(happy_nodes - nodes)
        issues = bool(missing_materials or missing_images or missing_idle_nodes or missing_happy_nodes)
        return {
            'ok': not issues,
            'missingFiles': [],
            'missingMaterials': sorted(set(missing_materials)),
            'missingImages': sorted(set(missing_images)),
            'missingIdleNodes': missing_idle_nodes,
            'missingHappyNodes': missing_happy_nodes,
            'idleTracks': len(idle_nodes),
            'happyTracks': len(happy_nodes),
            'scale': config.get('scale'),
        }


def audit_generation(generation: int, expected: dict[int, str]) -> dict:
    pack = latest_pack(generation)
    path = download_pack(generation, pack)
    expected_ids = list(RANGES[generation])
    expected_by_normalized = {normalize(expected[dex]): dex for dex in expected_ids}

    with zipfile.ZipFile(path) as archive:
        model_entries = {
            Path(name).stem: name
            for name in archive.namelist()
            if name.startswith(MODEL_ROOT) and name.endswith('.pk')
        }
        normalized_models: dict[str, tuple[str, str]] = {}
        for slug, name in model_entries.items():
            normalized_models.setdefault(normalize(slug), (slug, name))

        missing_models = []
        species_reports = []
        matched_entry_names = set()
        for dex in expected_ids:
            expected_name = expected[dex]
            match = normalized_models.get(normalize(expected_name))
            if match is None:
                missing_models.append({'dex': dex, 'species': expected_name})
                continue
            pack_slug, entry = match
            matched_entry_names.add(entry)
            inspection = inspect_pk(archive.read(entry))
            species_reports.append({
                'dex': dex,
                'species': expected_name,
                'packSlug': pack_slug,
                'pkBytes': archive.getinfo(entry).file_size,
                **inspection,
            })

        unexpected = sorted(
            Path(name).stem
            for name in model_entries.values()
            if name not in matched_entry_names
        )

    failed = [item for item in species_reports if not item['ok']]
    return {
        'generation': generation,
        'project': PROJECTS[generation],
        'version': {
            'id': pack['id'],
            'number': pack['number'],
            'name': pack['name'],
            'date': pack['date'],
            'filename': pack['filename'],
        },
        'zipBytes': path.stat().st_size,
        'expectedSpecies': len(expected_ids),
        'modelEntries': len(model_entries),
        'matchedSpecies': len(species_reports),
        'fullyValidSpecies': len(species_reports) - len(failed),
        'missingModels': missing_models,
        'failedSpecies': failed,
        'unexpectedModels': unexpected,
        'species': species_reports,
    }


def main() -> None:
    expected = expected_species()
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    generations = []
    for generation in (1, 2, 3):
        report = audit_generation(generation, expected)
        generations.append(report)
        print(
            'COVERAGE_GEN',
            generation,
            json.dumps({
                'version': report['version'],
                'zipBytes': report['zipBytes'],
                'expected': report['expectedSpecies'],
                'models': report['modelEntries'],
                'matched': report['matchedSpecies'],
                'fullyValid': report['fullyValidSpecies'],
                'missingModels': report['missingModels'],
                'failedCount': len(report['failedSpecies']),
                'failedSample': report['failedSpecies'][:12],
                'unexpectedCount': len(report['unexpectedModels']),
                'unexpectedSample': report['unexpectedModels'][:20],
            }, ensure_ascii=False),
        )

    summary = {
        'scope': '#001-386',
        'provider': 'Generations x Cobblemon',
        'requiredAssets': ['model.glb', 'config.json', 'idle.tranm', 'glad.tranm'],
        'expectedSpecies': 386,
        'matchedSpecies': sum(item['matchedSpecies'] for item in generations),
        'fullyValidSpecies': sum(item['fullyValidSpecies'] for item in generations),
        'missingModels': sum(len(item['missingModels']) for item in generations),
        'failedSpecies': sum(len(item['failedSpecies']) for item in generations),
    }
    payload = {'summary': summary, 'generations': generations}
    REPORT_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    print('COVERAGE_TOTAL', json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    main()
