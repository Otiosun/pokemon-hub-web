from __future__ import annotations

import importlib.util
import io
import json
import zipfile
from pathlib import Path

import py7zr

AUDIT_PATH = Path(__file__).with_name('audit-generations-gen1-3.py')
SPEC = importlib.util.spec_from_file_location('generations_coverage_audit', AUDIT_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError('Unable to load audit helpers')
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)

SAMPLES = ('caterpie', 'venomoth', 'ledyba', 'taillow', 'rayquaza', 'porygon2', 'unown_a')
MODEL_ROOT = 'assets/generations_core/bedrock/pokemon/models/'


def pk_names(payload: bytes) -> list[str]:
    with py7zr.SevenZipFile(io.BytesIO(payload), mode='r') as seven:
        return sorted(name for name in seven.getnames() if name and name.strip())


def main() -> None:
    packs = []
    for generation in (1, 2, 3):
        metadata = AUDIT.latest_pack(generation)
        path = AUDIT.download_pack(generation, metadata)
        packs.append((generation, zipfile.ZipFile(path)))

    for sample in SAMPLES:
        result = {'sample': sample, 'found': []}
        for generation, archive in packs:
            names = archive.namelist()
            model_entry = next(
                (name for name in names if name == f'{MODEL_ROOT}{sample}.pk'),
                None,
            )
            poser_entries = [
                name for name in names
                if '/bedrock/pokemon/posers/' in name and Path(name).stem == sample and name.endswith('.json')
            ]
            resolver_entries = [
                name for name in names
                if '/bedrock/pokemon/resolvers/' in name and Path(name).stem == sample and name.endswith('.json')
            ]
            if not model_entry and not poser_entries and not resolver_entries:
                continue
            row = {'generationPack': generation}
            if model_entry:
                row['modelEntry'] = model_entry
                row['pkFiles'] = pk_names(archive.read(model_entry))
            if poser_entries:
                row['posers'] = [
                    {'path': entry, 'json': json.loads(archive.read(entry).decode('utf-8'))}
                    for entry in poser_entries
                ]
            if resolver_entries:
                row['resolvers'] = [
                    {'path': entry, 'json': json.loads(archive.read(entry).decode('utf-8'))}
                    for entry in resolver_entries
                ]
            result['found'].append(row)
        print('POSER_PROBE', json.dumps(result, ensure_ascii=False))

    for _, archive in packs:
        archive.close()


if __name__ == '__main__':
    main()
