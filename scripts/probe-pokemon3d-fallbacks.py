from __future__ import annotations

import json
import urllib.request

SPECIES = (
    {'dex': 123, 'species': 'scyther'},
    {'dex': 292, 'species': 'shedinja'},
)
BASE = 'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular'


def request(url: str):
    return urllib.request.Request(url, headers={'User-Agent': 'PokemonHubFallbackProbe/0.1'})


def glb_document(data: bytes) -> dict:
    if data[:4] != b'glTF':
        raise RuntimeError('not a GLB')
    json_length = int.from_bytes(data[12:16], 'little')
    chunk_type = int.from_bytes(data[16:20], 'little')
    if chunk_type != 0x4E4F534A:
        raise RuntimeError('first GLB chunk is not JSON')
    return json.loads(data[20:20 + json_length].rstrip(b'\x00 \t\r\n').decode('utf-8'))


def main() -> None:
    reports = []
    for item in SPECIES:
        url = f"{BASE}/{item['dex']}.glb"
        try:
            with urllib.request.urlopen(request(url), timeout=45) as response:
                data = response.read()
            document = glb_document(data)
            animations = [
                {
                    'name': animation.get('name') or f'animation-{index}',
                    'channels': len(animation.get('channels') or []),
                    'samplers': len(animation.get('samplers') or []),
                }
                for index, animation in enumerate(document.get('animations') or [])
            ]
            reports.append({
                **item,
                'ok': True,
                'url': url,
                'bytes': len(data),
                'nodes': len(document.get('nodes') or []),
                'skins': len(document.get('skins') or []),
                'animations': animations,
                'extensionsUsed': document.get('extensionsUsed') or [],
                'extensionsRequired': document.get('extensionsRequired') or [],
            })
        except Exception as error:
            reports.append({**item, 'ok': False, 'url': url, 'error': str(error)})
    print('POKEMON3D_FALLBACK_PROBE', json.dumps(reports, ensure_ascii=False))


if __name__ == '__main__':
    main()
