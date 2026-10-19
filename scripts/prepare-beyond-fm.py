#!/usr/bin/env python3
"""Extract exactly four verified MP3 files for the Beyond FM server build."""
import hashlib
import json
from pathlib import Path
from zipfile import BadZipFile, ZipFile

ARCHIVE = Path('assets/beyond-fm/Beyond_FM_4_Faixas_Alola_Nova.zip')
DESTINATION = Path('public/beyond-fm')
TRACKS = (
    ('cynthia', '01_Qumu_Cynthia.mp3'),
    ('national-park', '02_Michael_Tai_National_Park.mp3'),
    ('driftveil', '03_The_Zame_Driftveil_City.mp3'),
    ('alola', '04_Satoshi_Alola_Instrumental.mp3'),
)


def main():
    if not ARCHIVE.exists():
        print('[Beyond FM] Server archive absent; retaining the public CC0 station.')
        return
    if not (100_000 <= ARCHIVE.stat().st_size <= 26_000_000):
        raise ValueError('Beyond FM archive has an invalid size')
    tracks = []
    files = {}
    try:
        with ZipFile(ARCHIVE) as archive:
            entries = archive.infolist()
            if len(entries) != 4 or {entry.filename for entry in entries} != {name for _, name in TRACKS}:
                raise ValueError('Beyond FM archive must contain exactly the four expected MP3 files')
            for track_id, name in TRACKS:
                info = archive.getinfo(name)
                if not (10_000 <= info.file_size <= 13_000_000):
                    raise ValueError(f'Beyond FM invalid MP3 size: {name}')
                data = archive.read(info)  # zipfile checks the CRC32
                if not (data.startswith(b'ID3') or (data[0] == 0xFF and (data[1] & 0xE0) == 0xE0)):
                    raise ValueError(f'Invalid MP3 stream: {name}')
                files[track_id] = data
                tracks.append({'id': track_id, 'src': f'/beyond-fm/{track_id}.mp3',
                               'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    except BadZipFile as error:
        raise ValueError('Beyond FM ZIP is corrupt') from error

    DESTINATION.mkdir(parents=True, exist_ok=True)
    for track_id, data in files.items():
        (DESTINATION / f'{track_id}.mp3').write_bytes(data)
    (DESTINATION / 'manifest.json').write_text(
        json.dumps({'version': 1, 'tracks': tracks}, separators=(',', ':')) + '\n',
        encoding='utf-8',
    )
    print('[Beyond FM] Four MP3s verified and included in the server build; fifth CC0 track stays remote.')


if __name__ == '__main__':
    main()
