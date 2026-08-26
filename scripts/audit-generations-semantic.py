from __future__ import annotations

import importlib.util
import io
import json
import re
import zipfile
from collections import Counter
from pathlib import Path

import py7zr

AUDIT_PATH = Path(__file__).with_name('audit-generations-gen1-3.py')
SPEC = importlib.util.spec_from_file_location('generations_coverage_audit', AUDIT_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError('Unable to load audit helpers')
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)

MODEL_ROOT = 'assets/generations_core/bedrock/pokemon/models/'
POSER_ROOT = 'assets/generations_core/bedrock/pokemon/posers/'
REPORT_PATH = Path('public/research/generations/semantic-coverage-report.json')
SUPPORTED_MOTIONS = ('.tranm', '.gfbanm', '.smd', '.smdx')
PK_CALL = re.compile(r"q\.pk(?:_primary)?\([^,]+,\s*['\"]([^'\"]+)['\"]\)")


def animation_name(expression: object) -> str | None:
    if not isinstance(expression, str):
        return None
    match = PK_CALL.search(expression)
    return match.group(1) if match else None


def choose_idle(poser: dict) -> tuple[str | None, str | None]:
    poses = poser.get('poses') or {}
    candidates: list[tuple[int, str, str]] = []
    for key, pose in poses.items():
        if not isinstance(pose, dict):
            continue
        types = set(pose.get('poseTypes') or [])
        animations = pose.get('animations') or []
        motion = animation_name(animations[0]) if animations else None
        if not motion:
            continue
        score = 0
        if 'NONE' in types:
            score += 100
        if 'PORTRAIT' in types:
            score += 50
        if 'PROFILE' in types:
            score += 50
        if 'STAND' in types:
            score += 40
        if pose.get('isBattle'):
            score -= 80
        lowered = key.lower()
        if lowered == 'idle':
            score += 20
        if 'noidle' in lowered:
            score += 10
        if score > 0:
            candidates.append((score, key, motion))
    if not candidates:
        return None, None
    candidates.sort(key=lambda item: (-item[0], item[1]))
    _, pose_key, motion = candidates[0]
    return pose_key, motion


def find_resource(names: set[str], stem: str | None) -> str | None:
    if not stem:
        return None
    clean = Path(stem).stem
    candidates = [
        name
        for name in names
        if Path(name).stem == clean and Path(name).suffix.lower() in SUPPORTED_MOTIONS
    ]
    if not candidates:
        return None
    order = {'.tranm': 0, '.gfbanm': 1, '.smd': 2, '.smdx': 3}
    candidates.sort(key=lambda name: (order.get(Path(name).suffix.lower(), 99), name))
    return candidates[0]


def choose_glb(names: set[str], slug: str) -> str | None:
    glbs = sorted(name for name in names if Path(name).suffix.lower() == '.glb')
    if not glbs:
        return None
    preferred = ('model.glb', f'{slug}.glb')
    for name in preferred:
        if name in glbs:
            return name
    if len(glbs) == 1:
        return glbs[0]
    return glbs[0]


def inspect_pk(payload: bytes, slug: str, poser: dict) -> dict:
    with py7zr.SevenZipFile(io.BytesIO(payload), mode='r') as seven:
        names = {name for name in seven.getnames() if name and name.strip()}

    idle_pose, idle_stem = choose_idle(poser)
    model = choose_glb(names, slug)
    idle = find_resource(names, idle_stem)
    config = 'config.json' if 'config.json' in names else None
    return {
        'model': model,
        'config': config,
        'idlePose': idle_pose,
        'idleStem': idle_stem,
        'idle': idle,
        'idleFormat': Path(idle).suffix.lower().lstrip('.') if idle else 'missing',
        'ready': bool(model and config and idle),
        'innerFileCount': len(names),
    }


def main() -> None:
    expected = AUDIT.expected_species()
    packs: dict[int, dict] = {}
    model_index: dict[str, list[dict]] = {}
    poser_index: dict[str, list[dict]] = {}

    for generation in (1, 2, 3):
        metadata = AUDIT.latest_pack(generation)
        path = AUDIT.download_pack(generation, metadata)
        archive = zipfile.ZipFile(path)
        packs[generation] = {'metadata': metadata, 'archive': archive}
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

    rows = []
    unresolved = []
    combinations = Counter()
    idle_stems = Counter()

    for dex in range(1, 387):
        species = expected[dex]
        key = AUDIT.normalize(species)
        lookup_keys = [key]
        if species == 'unown':
            lookup_keys.insert(0, AUDIT.normalize('unown_a'))

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

        preferred_generation = 1 if dex <= 151 else 2 if dex <= 251 else 3
        sort_key = lambda item: (
            0 if item['generationPack'] == preferred_generation else 1,
            0 if AUDIT.normalize(item['slug']) in lookup_keys else 1,
            item['slug'],
        )
        model_candidates.sort(key=sort_key)
        poser_candidates.sort(key=sort_key)

        if not model_candidates or not poser_candidates:
            unresolved.append({
                'dex': dex,
                'species': species,
                'reason': 'missing model or poser source',
                'modelCandidates': model_candidates[:4],
                'poserCandidates': poser_candidates[:4],
            })
            continue

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
        model_archive = packs[model_source['generationPack']]['archive']
        poser_archive = packs[matching_poser['generationPack']]['archive']
        poser = json.loads(poser_archive.read(matching_poser['entry']).decode('utf-8'))
        inspection = inspect_pk(model_archive.read(model_source['entry']), model_source['slug'], poser)
        combo = (
            f"glb+{inspection['idleFormat']}"
            if inspection['model']
            else f"missing+{inspection['idleFormat']}"
        )
        combinations[combo] += 1
        if inspection['idleStem']:
            idle_stems[inspection['idleStem']] += 1
        row = {
            'dex': dex,
            'species': species,
            'generationPack': model_source['generationPack'],
            'packSlug': model_source['slug'],
            'poserGenerationPack': matching_poser['generationPack'],
            **inspection,
        }
        rows.append(row)
        if not inspection['ready']:
            unresolved.append(row)

    summary = {
        'scope': '#001-386',
        'expectedSpecies': 386,
        'resolvedSpecies': len(rows),
        'readyIdle': sum(1 for row in rows if row['ready']),
        'unresolved': len(unresolved),
        'formatCombinations': dict(combinations),
        'idleMotionNames': dict(idle_stems.most_common()),
    }
    payload = {
        'summary': summary,
        'unresolved': unresolved,
        'species': rows,
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
    print('SEMANTIC_IDLE_COVERAGE_TOTAL', json.dumps(summary, ensure_ascii=False))
    print('SEMANTIC_IDLE_COVERAGE_UNRESOLVED', json.dumps(unresolved[:60], ensure_ascii=False))

    for data in packs.values():
        data['archive'].close()


if __name__ == '__main__':
    main()
