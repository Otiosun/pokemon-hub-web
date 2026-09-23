from __future__ import annotations

import io
import json
import math
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import py7zr
from PIL import Image

TEMP_ROOT = Path(tempfile.gettempdir())
IMPORTER = TEMP_ROOT / 'poke-importer'
if str(IMPORTER) not in sys.path:
    sys.path.insert(0, str(IMPORTER))

from GFLib.Anim.Animation import AnimationT

VERSION_ID = 'qzYLTuPI'
API_URL = f'https://api.modrinth.com/v2/version/{VERSION_ID}'
ZIP_PATH = TEMP_ROOT / 'generations-gen1.zip'
OUTPUT_ROOT = Path('public/research/generations')
DRACO_SOURCE = Path('node_modules/three/examples/jsm/libs/draco')
DRACO_OUTPUT = Path('public/research/draco')
MODEL_ROOT = 'assets/generations_core/bedrock/pokemon/models'
SPECIES = (
    {'slug': 'bulbasaur', 'dex': 1},
    {'slug': 'charmander', 'dex': 4},
    {'slug': 'squirtle', 'dex': 7},
)
SCALE = 0x7FFF
PI_QUARTER = math.pi / 4.0
PI_HALF = math.pi / 2.0


def request(url: str):
    return urllib.request.Request(url, headers={'User-Agent': 'PokemonHubAssetPipeline/0.1'})


def ensure_pack() -> None:
    with urllib.request.urlopen(request(API_URL), timeout=30) as response:
        metadata = json.load(response)
    files = metadata.get('files', [])
    if not files:
        raise RuntimeError('Modrinth version returned no files')
    asset = next((item for item in files if item.get('primary')), files[0])
    expected = int(asset.get('size') or 0)
    if ZIP_PATH.exists() and (not expected or ZIP_PATH.stat().st_size == expected):
        return
    with urllib.request.urlopen(request(asset['url']), timeout=90) as response, ZIP_PATH.open('wb') as target:
        shutil.copyfileobj(response, target, 1024 * 1024)
    if expected and ZIP_PATH.stat().st_size != expected:
        raise RuntimeError(f'Generation 1 download mismatch: {ZIP_PATH.stat().st_size} != {expected}')


def vec3(value):
    return [float(value.x), float(value.y), float(value.z)]


def expand_float(value: int) -> float:
    return value * (PI_HALF / SCALE) - PI_QUARTER


def unpack_quaternion(value):
    x = int(value.x) & 0xFFFF
    y = int(value.y) & 0xFFFF
    z = int(value.z) & 0xFFFF
    packed = (z << 32) | (y << 16) | x
    q1 = expand_float((packed >> 3) & 0x7FFF)
    q2 = expand_float((packed >> 18) & 0x7FFF)
    q3 = expand_float((packed >> 33) & 0x7FFF)
    values = [q1, q2, q3]
    missing = packed & 0b0011
    max_component = math.sqrt(max(1.0 - (q1 * q1 + q2 * q2 + q3 * q3), 0.0))
    values.insert(missing, max_component)
    if packed & 0b0100:
        values = [-component for component in values]
    return [float(component) for component in values]


def vector_track(track, fps):
    if track is None or getattr(track, 'co', None) is None:
        return None
    kind = type(track).__name__
    values = track.co
    if kind == 'FixedVectorTrackT':
        return {'times': [0.0], 'values': vec3(values)}
    if kind == 'DynamicVectorTrackT':
        return {
            'times': [index / fps for index in range(len(values))],
            'values': [component for value in values for component in vec3(value)],
        }
    if kind in {'Framed8VectorTrackT', 'Framed16VectorTrackT'}:
        return {
            'times': [int(frame) / fps for frame in track.frames],
            'values': [component for value in values for component in vec3(value)],
        }
    raise RuntimeError(f'Unsupported vector track type: {kind}')


def rotation_track(track, fps):
    if track is None or getattr(track, 'co', None) is None:
        return None
    kind = type(track).__name__
    values = track.co
    if kind == 'FixedRotationTrackT':
        return {'times': [0.0], 'values': unpack_quaternion(values)}
    if kind == 'DynamicRotationTrackT':
        return {
            'times': [index / fps for index in range(len(values))],
            'values': [component for value in values for component in unpack_quaternion(value)],
        }
    if kind in {'Framed8RotationTrackT', 'Framed16RotationTrackT'}:
        return {
            'times': [int(frame) / fps for frame in track.frames],
            'values': [component for value in values for component in unpack_quaternion(value)],
        }
    raise RuntimeError(f'Unsupported rotation track type: {kind}')


def build_animation(path: Path, name: str):
    animation = AnimationT.InitFromPackedBuf(bytearray(path.read_bytes()), 0)
    if animation.info is None or animation.skeleton is None:
        raise RuntimeError(f'{name}: invalid TRANM')
    fps = int(animation.info.frameRate)
    keyframes = int(animation.info.keyFrames)
    tracks = []
    for bone in animation.skeleton.tracks or []:
        if bone is None or not getattr(bone, 'name', None):
            continue
        item = {'name': bone.name}
        position = vector_track(bone.translate, fps)
        rotation = rotation_track(bone.rotate, fps)
        scale = vector_track(bone.scale, fps)
        if position is not None:
            item['position'] = position
        if rotation is not None:
            item['rotation'] = rotation
        if scale is not None:
            item['scale'] = scale
        tracks.append(item)
    return {
        'name': name,
        'loop': name == 'idle',
        'fps': fps,
        'keyFrames': keyframes,
        'duration': (keyframes - 1) / fps,
        'tracks': tracks,
    }


def glb_document(data: bytes):
    if data[:4] != b'glTF':
        raise RuntimeError('model.glb is not GLB')
    json_length = int.from_bytes(data[12:16], 'little')
    chunk_type = int.from_bytes(data[16:20], 'little')
    if chunk_type != 0x4E4F534A:
        raise RuntimeError('first GLB chunk is not JSON')
    return json.loads(data[20:20 + json_length].rstrip(b'\x00 \t\r\n').decode('utf-8'))


def image_array(path: Path, size: tuple[int, int] | None = None) -> np.ndarray:
    image = Image.open(path).convert('RGBA')
    if size is not None and image.size != size:
        image = image.resize(size, Image.Resampling.NEAREST)
    return np.asarray(image, dtype=np.float32) / 255.0


def color(values: dict, name: str, default: tuple[float, float, float]) -> np.ndarray:
    raw = values.get(name, default)
    return np.asarray(raw, dtype=np.float32).reshape((1, 1, 3))


def mix(left: np.ndarray, right: np.ndarray, amount: np.ndarray) -> np.ndarray:
    return left * (1.0 - amount) + right * amount


def bake_material(source: Path, material_name: str, material: dict, destination: Path) -> dict:
    images = material.get('images') or {}
    diffuse_name = images.get('diffuse')
    if not diffuse_name:
        raise RuntimeError(f'{material_name}: material has no diffuse image')
    diffuse_path = source / diffuse_name
    diffuse_image = Image.open(diffuse_path).convert('RGBA')
    width, height = diffuse_image.size
    diffuse = np.asarray(diffuse_image, dtype=np.float32) / 255.0
    rgb = diffuse[..., :3]
    alpha = diffuse[..., 3:4]

    if material.get('shader') == 'layered':
        layer_name = images.get('layer')
        mask_name = images.get('mask')
        layer = image_array(source / layer_name, (width, height)) if layer_name else np.zeros_like(diffuse)
        mask = image_array(source / mask_name, (width, height)) if mask_name else np.zeros_like(diffuse)
        layer_masks = np.clip(layer * 2.0, 0.0, 1.0)
        mask_amount = np.clip(mask[..., 0:1] * 2.0, 0.0, 1.0)
        values = material.get('values') or {}
        base = rgb.copy()
        for index, channel in enumerate((0, 1, 2, 3), start=1):
            weight = layer_masks[..., channel:channel + 1]
            base = mix(base, rgb * color(values, f'baseColor{index}', (1.0, 1.0, 1.0)), weight)
        base = mix(base, rgb * color(values, 'baseColor5', (1.0, 1.0, 1.0)), mask_amount)
        for index, channel in enumerate((0, 1, 2, 3), start=1):
            weight = layer_masks[..., channel:channel + 1]
            intensity = float(values.get(f'emiIntensity{index}', 0.0))
            emission = color(values, f'emiColor{index}', (0.0, 0.0, 0.0))
            applied = base + (emission - base) * intensity
            base = mix(base, applied, weight)
        intensity5 = float(values.get('emiIntensity5', 1.0))
        emission5 = color(values, 'emiColor5', (0.0, 0.0, 0.0)) * intensity5
        base = mix(base, emission5, mask_amount)
        rgb = np.clip(base, 0.0, 1.0)

    baked = np.concatenate((rgb, alpha), axis=2)
    baked_u8 = np.rint(np.clip(baked, 0.0, 1.0) * 255.0).astype(np.uint8)
    output_name = f'material-{material_name}.png'
    output_path = destination / output_name
    Image.fromarray(baked_u8, mode='RGBA').save(output_path, optimize=True)
    alpha_min = int(baked_u8[..., 3].min())
    values = material.get('values') or {}
    return {
        'texture': output_name,
        'transparent': alpha_min < 255,
        'useLight': bool(values.get('useLight', True)),
        'doubleSided': material.get('cull') == 'None',
    }


def build_species(archive: zipfile.ZipFile, slug: str, dex: int) -> dict:
    pk_path = f'{MODEL_ROOT}/{slug}.pk'
    try:
        pk_payload = archive.read(pk_path)
    except KeyError as error:
        raise RuntimeError(f'{slug}: missing {pk_path}') from error

    output = OUTPUT_ROOT / slug
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    with tempfile.TemporaryDirectory(prefix=f'{slug}-web-') as tmp:
        extracted = Path(tmp)
        with py7zr.SevenZipFile(io.BytesIO(pk_payload), mode='r') as seven:
            names = [name for name in seven.getnames() if name and name.strip()]
            seven.extract(path=extracted, targets=names)

        config = json.loads((extracted / 'config.json').read_text('utf-8'))
        model = extracted / 'model.glb'
        document = glb_document(model.read_bytes())
        node_names = {node.get('name') for node in document.get('nodes', []) if node.get('name')}
        shutil.copy2(model, output / 'model.glb')

        materials = config.get('materials') or {}
        default_variant = config.get('defaultVariant') or {}
        baked_cache: dict[str, dict] = {}
        mesh_bindings: dict[str, dict] = {}
        missing_materials: list[str] = []

        for mesh_name, mesh_config in default_variant.items():
            if mesh_config.get('hide'):
                continue
            material_name = mesh_config.get('material')
            material = materials.get(material_name)
            if not material_name or material is None:
                missing_materials.append(mesh_name)
                continue
            if material_name not in baked_cache:
                baked_cache[material_name] = bake_material(extracted, material_name, material, output)
            mesh_bindings[mesh_name] = baked_cache[material_name]

        animations = {}
        for source_name, public_name in (('idle', 'idle'), ('glad', 'happy')):
            source = extracted / f'{source_name}.tranm'
            if source.exists():
                animations[public_name] = build_animation(source, public_name)

        if 'idle' not in animations or 'happy' not in animations:
            raise RuntimeError(f'{slug}: idle/happy animation pair missing')

        missing_animation_nodes = sorted({
            track['name']
            for animation in animations.values()
            for track in animation['tracks']
            if track['name'] not in node_names
        })

        payload = {
            'provider': 'Generations x Cobblemon',
            'providerVersion': 'Gen 1 v3.1',
            'species': slug,
            'dex': dex,
            'scale': float(config.get('scale', 1.0)),
            'model': 'model.glb',
            'materials': mesh_bindings,
            'animations': animations,
            'missingAnimationNodes': missing_animation_nodes,
            'missingMaterials': missing_materials,
        }
        (output / 'asset.json').write_text(json.dumps(payload, separators=(',', ':')), 'utf-8')
        return {
            'species': slug,
            'dex': dex,
            'pkBytes': len(pk_payload),
            'modelBytes': (output / 'model.glb').stat().st_size,
            'assetJsonBytes': (output / 'asset.json').stat().st_size,
            'materials': len(mesh_bindings),
            'textures': len(baked_cache),
            'idleTracks': len(animations['idle']['tracks']),
            'happyTracks': len(animations['happy']['tracks']),
            'missingAnimationNodes': missing_animation_nodes,
            'missingMaterials': missing_materials,
        }


def main() -> None:
    ensure_pack()
    if not DRACO_SOURCE.exists():
        raise RuntimeError(f'Draco decoder directory missing: {DRACO_SOURCE}')
    if DRACO_OUTPUT.exists():
        shutil.rmtree(DRACO_OUTPUT)
    shutil.copytree(DRACO_SOURCE, DRACO_OUTPUT)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    reports = []
    with zipfile.ZipFile(ZIP_PATH) as archive:
        for species in SPECIES:
            reports.append(build_species(archive, species['slug'], species['dex']))

    print('GENERATIONS_STARTER_PIPELINE', json.dumps(reports, ensure_ascii=False))


if __name__ == '__main__':
    main()
