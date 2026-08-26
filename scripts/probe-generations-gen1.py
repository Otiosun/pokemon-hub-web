from __future__ import annotations

import json
import os
import re
import shutil
import urllib.request
import zipfile
from pathlib import Path

VERSION_ID = "qzYLTuPI"
API_URL = f"https://api.modrinth.com/v2/version/{VERSION_ID}"
OUT = Path("/tmp/generations-gen1.zip")
TARGETS = ("bulbasaur", "charmander", "squirtle", "pm0001", "pm0004", "pm0007")


def request(url: str):
    return urllib.request.Request(url, headers={"User-Agent": "PokemonHubAssetResearch/0.1"})


print(f"GENERATIONS_PROBE version={VERSION_ID}")
with urllib.request.urlopen(request(API_URL), timeout=30) as response:
    metadata = json.load(response)

files = metadata.get("files", [])
print("version_name=", metadata.get("name"))
print("version_number=", metadata.get("version_number"))
print("files=", json.dumps([
    {
        "filename": f.get("filename"),
        "size": f.get("size"),
        "primary": f.get("primary"),
        "url": f.get("url"),
    }
    for f in files
], ensure_ascii=False))

if not files:
    raise RuntimeError("Modrinth version returned no files")

asset = next((f for f in files if f.get("primary")), files[0])
url = asset["url"]
expected = int(asset.get("size") or 0)
print(f"downloading={asset['filename']} expected_bytes={expected}")

with urllib.request.urlopen(request(url), timeout=60) as response, OUT.open("wb") as target:
    total = 0
    while True:
        chunk = response.read(1024 * 1024)
        if not chunk:
            break
        target.write(chunk)
        total += len(chunk)
        if total and total % (32 * 1024 * 1024) < 1024 * 1024:
            print(f"download_progress={total}")

print(f"downloaded_bytes={OUT.stat().st_size}")
if expected and OUT.stat().st_size != expected:
    raise RuntimeError(f"download size mismatch: {OUT.stat().st_size} != {expected}")

with zipfile.ZipFile(OUT) as archive:
    infos = archive.infolist()
    print(f"zip_entries={len(infos)}")
    names = [info.filename for info in infos]
    matches = [
        info for info in infos
        if any(target in info.filename.lower() for target in TARGETS)
    ]

    print(f"starter_matches={len(matches)}")
    for info in matches[:200]:
        print(json.dumps({
            "path": info.filename,
            "compressed": info.compress_size,
            "size": info.file_size,
        }, ensure_ascii=False))

    if not matches:
        print("sample_entries=")
        for name in names[:200]:
            print(name)
    else:
        print("starter_payload_signatures=")
        for info in matches[:30]:
            if info.is_dir() or info.file_size > 32 * 1024 * 1024:
                continue
            data = archive.read(info)
            printable = re.findall(rb"[ -~]{5,}", data)
            interesting = [
                item.decode("utf-8", "replace")
                for item in printable
                if re.search(rb"idle|wait|walk|run|sleep|happy|attack|faint|roar|\.glb|\.smd|\.gfbanm", item, re.I)
            ]
            print(json.dumps({
                "path": info.filename,
                "magic_hex": data[:16].hex(),
                "strings": interesting[:80],
            }, ensure_ascii=False))

print("tools=", json.dumps({
    "7z": shutil.which("7z"),
    "7zz": shutil.which("7zz"),
    "unzip": shutil.which("unzip"),
}, ensure_ascii=False))
