#!/usr/bin/env python3
"""Extract exactly four verified MP3 files for the Beyond FM server build."""
import hashlib
import json
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

ARCHIVE = Path('assets/beyond-fm/Beyond_FM_4_Faixas_Alola_Nova.zip')
DESTINATION = Path('public/beyond-fm')
PARTS = tuple(Path(f'assets/beyond-fm/Beyond_FM_Parte_{n}_de_4.part') for n in range(1, 5))
PART_BYTES = (5195162, 5195162, 5195162, 5195161)
ARCHIVE_SHA256 = '74dd36e6e79bd78db24f8fb0f38a3771265d413421c0cafa884c6bc2c13fb609'
TRACKS = (
    ('cynthia', '01_Qumu_Cynthia.mp3'),
    ('national-park', '02_Michael_Tai_National_Park.mp3'),
    ('driftveil', '03_The_Zame_Driftveil_City.mp3'),
    ('alola', '04_Satoshi_Alola_Instrumental.mp3'),
)


def main():
    if ARCHIVE.is_file():
        archive_bytes = ARCHIVE.read_bytes()
    elif any(part.is_file() for part in PARTS):
        present = [part.is_file() for part in PARTS]
        if not all(present):
            print(f'[Beyond FM] Received {sum(present)}/4 archive parts; awaiting remaining parts.')
            return
        chunks = [part.read_bytes() for part in PARTS]
        if any(len(chunk) != size for chunk, size in zip(chunks, PART_BYTES)):
            raise ValueError('Beyond FM archive parts have incorrect sizes')
        archive_bytes = b''.join(chunks)
    else:
        print('[Beyond FM] Server archive absent; retaining the public CC0 station.')
        return
    if hashlib.sha256(archive_bytes).hexdigest() != ARCHIVE_SHA256:
        raise ValueError('Beyond FM archive checksum mismatch; check all four parts and names')
    tracks = []
    files = {}
    try:
        with ZipFile(BytesIO(archive_bytes)) as archive:
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
