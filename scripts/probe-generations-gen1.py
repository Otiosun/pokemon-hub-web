from __future__ import annotations

import io
import json
import re
import shutil
import struct
import tempfile
import urllib.request
import zipfile
from pathlib import Path

import py7zr

VERSION_ID = "qzYLTuPI"
API_URL = f"https://api.modrinth.com/v2/version/{VERSION_ID}"
OUT = Path("/tmp/generations-gen1.zip")
SPECIES = ("bulbasaur", "charmander", "squirtle")
TARGETS = SPECIES + ("pm0001", "pm0004", "pm0007")


def request(url: str):
    return urllib.request.Request(url, headers={"User-Agent": "PokemonHubAssetResearch/0.1"})


def glb_summary(data: bytes):
    if len(data) < 20 or data[:4] != b"glTF":
        return {"valid": False, "magic": data[:8].hex()}
    version, total_length = struct.unpack_from("<II", data, 4)
    offset = 12
    document = None
    while offset + 8 <= len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == 0x4E4F534A:  # JSON
            document = json.loads(chunk.rstrip(b"\x00 \t\r\n").decode("utf-8"))
            break
    if document is None:
        return {"valid": True, "version": version, "length": total_length, "json": False}
    return {
        "valid": True,
        "version": version,
        "length": total_length,
        "nodes": len(document.get("nodes", [])),
        "meshes": len(document.get("meshes", [])),
        "skins": len(document.get("skins", [])),
        "materials": len(document.get("materials", [])),
        "animations": [animation.get("name") for animation in document.get("animations", [])],
    }


def inspect_pk(species: str, payload: bytes):
    print(f"\nPK_INSPECT {species} bytes={len(payload)} magic={payload[:8].hex()}")
    with tempfile.TemporaryDirectory(prefix=f"pk-{species}-") as tmp:
        destination = Path(tmp)
        with py7zr.SevenZipFile(io.BytesIO(payload), mode="r") as seven:
            names = seven.getnames()
            print("pk_entries=", json.dumps(names, ensure_ascii=False))
            seven.extractall(path=destination)

        for path in sorted(p for p in destination.rglob("*") if p.is_file()):
            rel = path.relative_to(destination).as_posix()
            size = path.stat().st_size
            print(json.dumps({"pk_file": rel, "size": size}, ensure_ascii=False))

            lower = rel.lower()
            if lower.endswith("config.json") and size <= 100_000:
                text = path.read_text("utf-8", errors="replace")
                try:
                    config = json.loads(text)
                    print("PK_CONFIG=", json.dumps(config, ensure_ascii=False))
                except json.JSONDecodeError:
                    print("PK_CONFIG_RAW=", text[:20_000])

            if lower.endswith(".glb"):
                print("GLB_SUMMARY=", json.dumps(glb_summary(path.read_bytes()), ensure_ascii=False))

            if any(lower.endswith(ext) for ext in (".smd", ".gfbanm", ".tranm", ".tracm", ".trm", ".anim")):
                raw = path.read_bytes()
                printable = [item.decode("utf-8", "replace") for item in re.findall(rb"[ -~]{4,}", raw)]
                print("ANIM_RESOURCE=", json.dumps({
                    "file": rel,
                    "size": len(raw),
                    "strings": printable[:80],
                }, ensure_ascii=False))


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
        if total and total % (64 * 1024 * 1024) < 1024 * 1024:
            print(f"download_progress={total}")

print(f"downloaded_bytes={OUT.stat().st_size}")
if expected and OUT.stat().st_size != expected:
    raise RuntimeError(f"download size mismatch: {OUT.stat().st_size} != {expected}")

with zipfile.ZipFile(OUT) as archive:
    infos = archive.infolist()
    print(f"zip_entries={len(infos)}")
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

    for species in SPECIES:
        poser_path = f"assets/generations_core/bedrock/pokemon/posers/{species}.json"
        model_path = f"assets/generations_core/bedrock/pokemon/models/{species}.pk"
        poser = json.loads(archive.read(poser_path).decode("utf-8"))
        print(f"\nPOSER {species}=", json.dumps(poser, ensure_ascii=False))
        inspect_pk(species, archive.read(model_path))

print("tools=", json.dumps({
    "7z": shutil.which("7z"),
    "7zz": shutil.which("7zz"),
    "unzip": shutil.which("unzip"),
}, ensure_ascii=False))
