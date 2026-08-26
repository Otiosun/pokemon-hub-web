from __future__ import annotations

import io
import json
import re
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path

import py7zr

from audit_generations_gen1_3 import PROJECTS, download_pack, expected_species, latest_pack, normalize

MODEL_ROOT = 'assets/generations_core/bedrock/pokemon/models/'
REPORT_PATH = Path('public/research/generations/format-report.json')


def choose(names: set[str], candidates: tuple[str, ...]) -> str | None:
    return next((candidate for candidate in candidates if candidate in names), None)


def format_of(filename: str | None) -> str:
    if not filename:
        return 'missing'
    return Path(filename).suffix.lower().lstrip('.') or 'unknown'


def inspect_names(payload: bytes) -> dict:
    with py7zr.SevenZipFile(io.BytesIO(payload), mode='r') as seven:
        names = {name for name in seven.getnames() if name and name.strip()}

    model = choose(names, ('model.glb', 'model.smd', 'model.smdx'))
    idle = choose(names, ('idle.tranm', 'idle.smd', 'idle.smdx'))
    happy = choose(
        names,
        ('glad.tranm', 'glad.smd', 'glad.smdx', 'happy.tranm', 'happy.smd', 'happy.smdx'),
    )
    config = 'config.json' if 'config.json' in names else None

    idle_like = sorted(
        name for name in names
        if 'idle' in Path(name).stem.lower() and Path(name).suffix.lower() in {'.tranm', '.smd', '.smdx'}
    )
    happy_like = sorted(
        name for name in names
        if any(word in Path(name).stem.lower() for word in ('glad', 'happy'))
        and Path(name).suffix.lower() in {'.tranm', '.smd', '.smdx'}
    )
    model_like = sorted(
        name for name in names
        if Path(name).stem.lower() == 'model' or Path(name).suffix.lower() in {'.glb', '.smdx'}
    )

    return {
        'model': model,
        'idle': idle,
        'happy': happy,
        'config': config,
        'modelFormat': format_of(model),
        'idleFormat': format_of(idle),
        'happyFormat': format_of(happy),
        'idleLike': idle_like[:12],
        'happyLike': happy_like[:12],
        'modelLike': model_like[:12],
        'innerFileCount': len(names),
    }


def request(url: str):
    return urllib.request.Request(url, headers={'User-Agent': 'PokemonHubFormatAudit/0.1'})


def main() -> None:
    expected = expected_species()
    packs = {}
    indexes: dict[str, list[dict]] = {}

    for generation in (1, 2, 3):
        pack = latest_pack(generation)
        path = download_pack(generation, pack)
        archive = zipfile.ZipFile(path)
        packs[generation] = {'metadata': pack, 'path': path, 'archive': archive}
        for entry in archive.namelist():
            if not entry.startswith(MODEL_ROOT) or not entry.endswith('.pk'):
                continue
            slug = Path(entry).stem
            indexes.setdefault(normalize(slug), []).append(
                {'generationPack': generation, 'slug': slug, 'entry': entry}
            )

    species_rows = []
    missing_sources = []
    model_formats = Counter()
    idle_formats = Counter()
    happy_formats = Counter()
    combinations = Counter()

    for dex in range(1, 387):
        species = expected[dex]
        key = normalize(species)
        candidates = indexes.get(key, [])
        if not candidates and species == 'unown':
            candidates = indexes.get(normalize('unown_a'), [])
        if not candidates:
            prefix_candidates = [
                candidate
                for indexed_key, values in indexes.items()
                if indexed_key.startswith(key)
                for candidate in values
            ]
            candidates = prefix_candidates

        if not candidates:
            missing_sources.append({'dex': dex, 'species': species})
            continue

        preferred_generation = 1 if dex <= 151 else 2 if dex <= 251 else 3
        candidates.sort(
            key=lambda item: (
                0 if item['generationPack'] == preferred_generation else 1,
                0 if normalize(item['slug']) == key else 1,
                item['slug'],
            )
        )
        source = candidates[0]
        archive = packs[source['generationPack']]['archive']
        formats = inspect_names(archive.read(source['entry']))
        model_formats[formats['modelFormat']] += 1
        idle_formats[formats['idleFormat']] += 1
        happy_formats[formats['happyFormat']] += 1
        combo = f"{formats['modelFormat']}+{formats['idleFormat']}+{formats['happyFormat']}"
        combinations[combo] += 1
        complete = bool(formats['model'] and formats['config'] and formats['idle'] and formats['happy'])
        species_rows.append(
            {
                'dex': dex,
                'species': species,
                'generationPack': source['generationPack'],
                'packSlug': source['slug'],
                'completePair': complete,
                **formats,
            }
        )

    incomplete = [row for row in species_rows if not row['completePair']]
    summary = {
        'scope': '#001-386',
        'expectedSpecies': 386,
        'resolvedSource': len(species_rows),
        'completeIdleHappyPair': len(species_rows) - len(incomplete),
        'incompletePair': len(incomplete),
        'missingSource': len(missing_sources),
        'modelFormats': dict(model_formats),
        'idleFormats': dict(idle_formats),
        'happyFormats': dict(happy_formats),
        'formatCombinations': dict(combinations),
    }
    payload = {
        'summary': summary,
        'missingSources': missing_sources,
        'incompleteSpecies': incomplete,
        'species': species_rows,
        'packVersions': {
            str(generation): {
                'id': data['metadata']['id'],
                'number': data['metadata']['number'],
                'filename': data['metadata']['filename'],
                'size': data['metadata']['size'],
            }
            for generation, data in packs.items()
        },
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    print('FORMAT_COVERAGE_TOTAL', json.dumps(summary, ensure_ascii=False))
    print('FORMAT_COVERAGE_INCOMPLETE', json.dumps(incomplete[:40], ensure_ascii=False))
    print('FORMAT_COVERAGE_MISSING', json.dumps(missing_sources, ensure_ascii=False))

    for data in packs.values():
        data['archive'].close()


if __name__ == '__main__':
    main()
