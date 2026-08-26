from __future__ import annotations

import io
import json
import math
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

import py7zr

IMPORTER = Path('/tmp/poke-importer')
if str(IMPORTER) not in sys.path:
    sys.path.insert(0, str(IMPORTER))

from GFLib.Anim.Animation import AnimationT

ZIP_PATH = Path('/tmp/generations-gen1.zip')
OUTPUT = Path('public/research/generations/charmander')
PK_PATH = 'assets/generations_core/bedrock/pokemon/models/charmander.pk'

SCALE = 0x7FFF
PI_QUARTER = math.pi / 4.0
PI_HALF = math.pi / 2.0


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
    return [float(values[0]), float(values[1]), float(values[2]), float(values[3])]


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
        'loop': bool(animation.info.doesLoop),
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


if not ZIP_PATH.exists():
    raise RuntimeError('Generation 1 zip is missing; run probe-generations-gen1.py first')

OUTPUT.mkdir(parents=True, exist_ok=True)
for child in OUTPUT.iterdir():
    if child.is_file():
        child.unlink()
    elif child.is_dir():
        shutil.rmtree(child)

with zipfile.ZipFile(ZIP_PATH) as outer:
    pk_payload = outer.read(PK_PATH)

with tempfile.TemporaryDirectory(prefix='charmander-web-') as tmp:
    extracted = Path(tmp)
    with py7zr.SevenZipFile(io.BytesIO(pk_payload), mode='r') as seven:
        names = [name for name in seven.getnames() if name and name.strip()]
        seven.extract(path=extracted, targets=names)

    model = extracted / 'model.glb'
    document = glb_document(model.read_bytes())
    node_names = {node.get('name') for node in document.get('nodes', []) if node.get('name')}
    mesh_names = [mesh.get('name') for mesh in document.get('meshes', [])]
    extensions_used = document.get('extensionsUsed', [])
    extensions_required = document.get('extensionsRequired', [])

    for filename in (
        'model.glb',
        'pm0004_00_00_body_alb.png',
        'pm0004_00_00_body_rare_alb.png',
        'eyes.png',
        'fire.png',
    ):
        shutil.copy2(extracted / filename, OUTPUT / filename)

    animations = {}
    for animation_name in ('idle', 'battleidle', 'walk', 'glad', 'attack', 'sleeploop'):
        source = extracted / f'{animation_name}.tranm'
        if source.exists():
            animations[animation_name] = build_animation(source, animation_name)

    missing_nodes = sorted({
        track['name']
        for animation in animations.values()
        for track in animation['tracks']
        if track['name'] not in node_names
    })

    payload = {
        'provider': 'Generations x Cobblemon',
        'species': 'charmander',
        'dex': 4,
        'scale': 1.5,
        'model': 'model.glb',
        'textures': {
            'body': 'pm0004_00_00_body_alb.png',
            'shinyBody': 'pm0004_00_00_body_rare_alb.png',
            'eyes': 'eyes.png',
            'fire': 'fire.png',
        },
        'meshNames': mesh_names,
        'nodeCount': len(document.get('nodes', [])),
        'nodeNames': sorted(node_names),
        'extensionsUsed': extensions_used,
        'extensionsRequired': extensions_required,
        'missingAnimationNodes': missing_nodes,
        'animations': animations,
    }
    (OUTPUT / 'motion.json').write_text(json.dumps(payload, separators=(',', ':')), 'utf-8')

    print('GENERATIONS_WEB_ASSET', json.dumps({
        'output': str(OUTPUT),
        'modelBytes': (OUTPUT / 'model.glb').stat().st_size,
        'nodeCount': payload['nodeCount'],
        'meshNames': mesh_names,
        'extensionsUsed': extensions_used,
        'extensionsRequired': extensions_required,
        'animationNames': list(animations),
        'idleTracks': len(animations['idle']['tracks']),
        'idleDuration': animations['idle']['duration'],
        'missingAnimationNodes': missing_nodes,
        'motionJsonBytes': (OUTPUT / 'motion.json').stat().st_size,
    }, ensure_ascii=False))