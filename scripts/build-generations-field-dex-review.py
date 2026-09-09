from __future__ import annotations

import importlib.util
import json
import shutil
import zipfile
from pathlib import Path

SEMANTIC_PATH = Path(__file__).with_name('audit-generations-semantic.py')
BATCH_PATH = Path(__file__).with_name('build-generations-batch.py')
OUTPUT_ROOT = Path('public/research/generations')
DRACO_SOURCE = Path('node_modules/three/examples/jsm/libs/draco')
DRACO_OUTPUT = Path('public/research/draco')
REVIEW_DEX = (4, 10, 245, 249, 384)


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'Unable to load {path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SEMANTIC = load_module('generations_semantic_review', SEMANTIC_PATH)
BATCH = load_module('generations_batch_review', BATCH_PATH)
AUDIT = SEMANTIC.AUDIT
MODEL_ROOT = SEMANTIC.MODEL_ROOT
POSER_ROOT = SEMANTIC.POSER_ROOT


def index_sources(archives: dict[int, zipfile.ZipFile]):
    model_index: dict[str, list[dict]] = {}
    poser_index: dict[str, list[dict]] = {}
    for generation, archive in archives.items():
        for entry in archive.namelist():
            if entry.startswith(MODEL_ROOT) and entry.endswith('.pk'):
                slug = Path(entry).stem
                model_index.setdefault(AUDIT.normalize(slug), []).append(
                    {'generationPack': generation, 'slug': slug, 'entry': entry}
                )
            elif entry.startswith(POSER_ROOT) and entry.endswith('.json'):
                slug = Path(entry).stem
                poser_index.setdefault(AUDIT.normalize(slug), []).append(
                    {'generationPack': generation, 'slug': slug, 'entry': entry}
                )
    return model_index, poser_index


def resolve_row(
    dex: int,
    expected: dict[int, str],
    archives: dict[int, zipfile.ZipFile],
    model_index: dict[str, list[dict]],
    poser_index: dict[str, list[dict]],
) -> dict:
    species = expected[dex]
    key = AUDIT.normalize(species)
    lookup_keys = [key]

    model_candidates = [candidate for lookup in lookup_keys for candidate in model_index.get(lookup, [])]
    poser_candidates = [candidate for lookup in lookup_keys for candidate in poser_index.get(lookup, [])]
    if not model_candidates:
        model_candidates = [
            candidate
            for indexed_key, values in model_index.items()
            if indexed_key.startswith(key)
            for candidate in values
        ]
    if not poser_candidates:
        poser_candidates = [
            candidate
            for indexed_key, values in poser_index.items()
            if indexed_key.startswith(key)
            for candidate in values
        ]
    if not model_candidates or not poser_candidates:
        raise RuntimeError(f'#{dex:03d} {species}: no model/poser candidates')

    preferred_generation = 1 if dex <= 151 else 2 if dex <= 251 else 3

    def sort_key(item: dict):
        return (
            0 if item['generationPack'] == preferred_generation else 1,
            0 if AUDIT.normalize(item['slug']) in lookup_keys else 1,
            item['slug'],
        )

    model_candidates.sort(key=sort_key)
    poser_candidates.sort(key=sort_key)
    model_source = model_candidates[0]
    matching_poser = next(
        (
            item
            for item in poser_candidates
            if item['generationPack'] == model_source['generationPack']
            and AUDIT.normalize(item['slug']) == AUDIT.normalize(model_source['slug'])
        ),
        poser_candidates[0],
    )

    model_archive = archives[model_source['generationPack']]
    poser_archive = archives[matching_poser['generationPack']]
    poser = json.loads(poser_archive.read(matching_poser['entry']).decode('utf-8'))
    inspection = SEMANTIC.inspect_pk(model_archive.read(model_source['entry']), model_source['slug'], poser)
    if not inspection['ready']:
        raise RuntimeError(f'#{dex:03d} {species}: unresolved idle source {inspection}')

    return {
        'dex': dex,
        'species': species,
        'generationPack': model_source['generationPack'],
        'packSlug': model_source['slug'],
        'poserGenerationPack': matching_poser['generationPack'],
        **inspection,
    }


def main() -> None:
    expected = AUDIT.expected_species()
    generations = sorted({1 if dex <= 151 else 2 if dex <= 251 else 3 for dex in REVIEW_DEX})
    metadata_by_generation: dict[int, dict] = {}
    archives: dict[int, zipfile.ZipFile] = {}

    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    if not DRACO_SOURCE.exists():
        raise RuntimeError(f'Draco decoder directory missing: {DRACO_SOURCE}')
    if DRACO_OUTPUT.exists():
        shutil.rmtree(DRACO_OUTPUT)
    shutil.copytree(DRACO_SOURCE, DRACO_OUTPUT)

    try:
        for generation in generations:
            metadata = AUDIT.latest_pack(generation)
            pack_path = AUDIT.download_pack(generation, metadata)
            metadata_by_generation[generation] = metadata
            archives[generation] = zipfile.ZipFile(pack_path)

        model_index, poser_index = index_sources(archives)
        reports = []
        resolved_rows = []
        for dex in REVIEW_DEX:
            row = resolve_row(dex, expected, archives, model_index, poser_index)
            resolved_rows.append(row)
            generation = int(row['generationPack'])
            reports.append(
                BATCH.build_species(
                    archives[generation],
                    metadata_by_generation[generation],
                    row,
                    OUTPUT_ROOT,
                )
            )

        manifest = {
            'schemaVersion': 1,
            'scope': 'FIELD DEX silhouette review',
            'provider': 'Generations x Cobblemon',
            'animationPolicy': ['idle'],
            'requested': list(REVIEW_DEX),
            'built': len(reports),
            'assets': reports,
        }
        (OUTPUT_ROOT / 'manifest.json').write_text(
            json.dumps(manifest, ensure_ascii=False, separators=(',', ':')),
            'utf-8',
        )
        print('FIELD_DEX_REVIEW_ASSETS', json.dumps(manifest, ensure_ascii=False), flush=True)
    finally:
        for archive in archives.values():
            archive.close()


if __name__ == '__main__':
    main()
