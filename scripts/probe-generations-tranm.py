from __future__ import annotations

import io
import json
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
SPECIES = ('bulbasaur', 'charmander', 'squirtle')


def describe_track(track):
    if track is None:
        return None
    result = {'type': type(track).__name__}
    values = getattr(track, 'co', None)
    frames = getattr(track, 'frames', None)
    if values is not None:
        try:
            result['values'] = len(values)
        except TypeError:
            result['values'] = 1
    if frames is not None:
        try:
            result['frames'] = len(frames)
        except TypeError:
            pass
    return result


with zipfile.ZipFile(ZIP_PATH) as outer:
    for species in SPECIES:
        pk_path = f'assets/generations_core/bedrock/pokemon/models/{species}.pk'
        payload = outer.read(pk_path)
        with tempfile.TemporaryDirectory(prefix=f'tranm-{species}-') as tmp:
            destination = Path(tmp)
            with py7zr.SevenZipFile(io.BytesIO(payload), mode='r') as seven:
                seven.extractall(path=destination)

            print(f'\nTRANM_DECODE {species}')
            for animation_name in ('idle', 'battleidle', 'walk', 'glad', 'attack'):
                animation_path = destination / f'{animation_name}.tranm'
                if not animation_path.exists():
                    continue
                animation = AnimationT.InitFromPackedBuf(bytearray(animation_path.read_bytes()), 0)
                if animation.info is None or animation.skeleton is None:
                    print(json.dumps({'animation': animation_name, 'valid': False}))
                    continue
                tracks = animation.skeleton.tracks or []
                print(json.dumps({
                    'animation': animation_name,
                    'valid': True,
                    'loops': animation.info.doesLoop,
                    'keyFrames': animation.info.keyFrames,
                    'frameRate': animation.info.frameRate,
                    'duration': round((animation.info.keyFrames - 1) / animation.info.frameRate, 4) if animation.info.frameRate else None,
                    'tracks': len(tracks),
                }))
                for track in tracks:
                    if track is None or not getattr(track, 'name', None):
                        continue
                    if track.name.lower() in {'head', 'spine_01', 'spine_02', 'waist', 'tail_01', 'tail_02', 'tail_03', 'tail_04', 'tail_05', 'tail_06', 'left_arm_01', 'right_arm_01', 'origin'}:
                        print(json.dumps({
                            'bone': track.name,
                            'translate': describe_track(track.translate),
                            'rotate': describe_track(track.rotate),
                            'scale': describe_track(track.scale),
                        }))
