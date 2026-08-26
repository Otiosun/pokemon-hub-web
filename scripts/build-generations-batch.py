from __future__ import annotations

import argparse
import importlib.util
import io
import json
import shutil
import tempfile
import zipfile
from pathlib import Path

import py7zr

FORMAT_PATH = Path(__file__).with_name('build-generations-format-samples.py')
FORMAT_SPEC = importlib.util.spec_from_file_location('generations_format', FORMAT_PATH)
if FORMAT_SPEC is None or FORMAT_SPEC.loader is None:
    raise RuntimeError('Unable to load Generations format helpers')
FORMAT = importlib.util.module_from_spec(FORMAT_SPEC)
FORMAT_SPEC.loader.exec_module(FORMAT)

AUDIT = FORMAT.AUDIT
BASE = FORMAT.BASE
MODEL_ROOT = 'assets/generations_core/bedrock/pokemon/models/'
DEFAULT_REPORT = Path('public/research/generations/semantic-coverage-report.json')
DEFAULT_OUTPUT = Path('/tmp/pokemon-hub-generations-assets')
SYNTHETIC_ANIMATION_HELPERS = {'blender_implicit'}


def parse_ids(args: argparse.Namespace) -> list[int]:
    if args.all:
        return list(range(1, 387))
    if args.range:
        try:
            start_text, end_text = args.range.split('-', 1)
            start, end = int(start_text), int(end_text)
        except (ValueError, AttributeError) as error:
            raise SystemExit('--range must use START-END, for example 1-151') from error
        if start > end:
            start, end = end, start
        ids = list(range(start, end + 1))
    elif args.dex:
        try:
            ids = sorted({int(value.strip()) for value in args.dex.split(',') if value.strip()})
        except ValueError as error:
            raise SystemExit('--dex must be comma-separated integers, for example 1,4,7') from error
    else:
        ids = [1, 4, 7]

    invalid = [dex for dex in ids if dex < 1 or dex > 386]
    if invalid:
        raise SystemExit(f'Dex IDs outside #001-386: {invalid}')
    return ids


def is_safe_archive_path(name: str) -> bool:
    candidate = Path(name)
    return not candidate.is_absolute() and '..' not in candidate.parts


def extract_pk(archive: zipfile.ZipFile, slug: str, destination: Path) -> tuple[bytes, set[str]]:
    entry = f'{MODEL_ROOT}{slug}.pk'
    payload = archive.read(entry)
    with py7zr.SevenZipFile(io.BytesIO(payload), mode='r') as seven:
        names = {
            name
            for name in seven.getnames()
            if name and name.strip() and is_safe_archive_path(name)
        }
        seven.extract(path=destination, targets=sorted(names))
    return payload, names


def build_species(
    archive: zipfile.ZipFile,
    pack_metadata: dict,
    row: dict,
    output_root: Path,
) -> dict:
    dex = int(row['dex'])
    species = str(row['species'])
    pack_slug = str(row['packSlug'])
    model_name = str(row['model'])
    idle_name = str(row['idle'])
    output = output_root / species

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=f'pokemon-{dex:03d}-') as tmp:
        extracted = Path(tmp)
        pk_payload, names = extract_pk(archive, pack_slug, extracted)
        required = {'config.json', model_name, idle_name}
        missing_files = sorted(required - names)
        if missing_files:
            raise RuntimeError(f'#{dex:03d} {species}: missing inner files {missing_files}')

        config = json.loads((extracted / 'config.json').read_text('utf-8'))
        model_source = extracted / model_name
        model_bytes = model_source.read_bytes()
        document = BASE.glb_document(model_bytes)
        node_names = {node.get('name') for node in document.get('nodes', []) if node.get('name')}
        shutil.copy2(model_source, output / 'model.glb')

        materials = config.get('materials') or {}
        default_variant = config.get('defaultVariant') or {}
        baked_cache: dict[str, dict] = {}
        mesh_bindings: dict[str, dict] = {}
        missing_materials: list[str] = []

        for mesh_name, mesh_config in default_variant.items():
            if mesh_config.get('hide'):
                continue
            material_name = mesh_config.get('material')
            material = materials.get(material_name)
            if not material_name or material is None:
                missing_materials.append(mesh_name)
                continue
            if material_name not in baked_cache:
                baked_cache[material_name] = BASE.bake_material(
                    extracted,
                    material_name,
                    material,
                    output,
                )
            mesh_bindings[mesh_name] = baked_cache[material_name]

        idle = FORMAT.build_motion(extracted / idle_name, 'idle')
        ignored_animation_nodes = sorted(
            track['name']
            for track in idle['tracks']
            if track['name'] not in node_names and track['name'] in SYNTHETIC_ANIMATION_HELPERS
        )
        if ignored_animation_nodes:
            idle['tracks'] = [
                track for track in idle['tracks'] if track['name'] not in SYNTHETIC_ANIMATION_HELPERS
            ]
        missing_animation_nodes = sorted(
            track['name']
            for track in idle['tracks']
            if track['name'] not in node_names
        )
        if missing_materials or missing_animation_nodes:
            raise RuntimeError(
                f'#{dex:03d} {species}: missingMaterials={missing_materials} '
                f'missingAnimationNodes={missing_animation_nodes}'
            )

        payload = {
            'schemaVersion': 1,
            'provider': 'Generations x Cobblemon',
            'providerVersion': pack_metadata.get('number') or pack_metadata.get('name'),
            'species': species,
            'dex': dex,
            'scale': float(config.get('scale', 1.0)),
            'model': 'model.glb',
            'materials': mesh_bindings,
            'animations': {'idle': idle},
            'missingAnimationNodes': [],
            'ignoredAnimationNodes': ignored_animation_nodes,
            'missingMaterials': [],
            'source': {
                'generationPack': int(row['generationPack']),
                'packSlug': pack_slug,
                'modelFile': model_name,
                'idlePose': row.get('idlePose'),
                'idleFile': idle_name,
                'idleFormat': row.get('idleFormat'),
            },
        }
        asset_path = output / 'asset.json'
        asset_path.write_text(json.dumps(payload, separators=(',', ':')), 'utf-8')

        texture_bytes = sum(path.stat().st_size for path in output.glob('material-*.*'))
        return {
            'dex': dex,
            'species': species,
            'generationPack': int(row['generationPack']),
            'packSlug': pack_slug,
            'idleFormat': row.get('idleFormat'),
            'idleFile': idle_name,
            'idleTracks': len(idle['tracks']),
            'ignoredAnimationNodes': ignored_animation_nodes,
            'pkBytes': len(pk_payload),
            'modelBytes': len(model_bytes),
            'textureBytes': texture_bytes,
            'assetJsonBytes': asset_path.stat().st_size,
            'path': species,
        }


def main() -> None:
    parser = argparse.ArgumentParser(description='Build web-ready idle-only Generations assets.')
    selector = parser.add_mutually_exclusive_group()
    selector.add_argument('--dex', help='Comma-separated National Dex IDs, e.g. 1,4,7')
    selector.add_argument('--range', help='Inclusive National Dex range, e.g. 1-151')
    selector.add_argument('--all', action='store_true', help='Build all #001-386')
    parser.add_argument('--report', type=Path, default=DEFAULT_REPORT)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--keep-output', action='store_true', help='Do not clean the output root first')
    args = parser.parse_args()

    dex_ids = parse_ids(args)
    if not args.report.exists():
        raise SystemExit(
            f'Semantic report not found: {args.report}. Run scripts/audit-generations-semantic.py first.'
        )

    report = json.loads(args.report.read_text('utf-8'))
    rows_by_dex = {int(row['dex']): row for row in report.get('species', [])}
    missing_rows = [dex for dex in dex_ids if dex not in rows_by_dex]
    if missing_rows:
        raise SystemExit(f'Semantic report has no rows for: {missing_rows}')

    if not args.keep_output and args.output.exists():
        shutil.rmtree(args.output)
    args.output.mkdir(parents=True, exist_ok=True)

    generations = sorted({int(rows_by_dex[dex]['generationPack']) for dex in dex_ids})
    packs: dict[int, tuple[dict, zipfile.ZipFile]] = {}
    reports: list[dict] = []
    failures: list[dict] = []

    try:
        for generation in generations:
            metadata = AUDIT.latest_pack(generation)
            path = AUDIT.download_pack(generation, metadata)
            packs[generation] = (metadata, zipfile.ZipFile(path))

        for index, dex in enumerate(dex_ids, start=1):
            row = rows_by_dex[dex]
            generation = int(row['generationPack'])
            metadata, archive = packs[generation]
            try:
                result = build_species(archive, metadata, row, args.output)
                reports.append(result)
            except Exception as error:  # continue audit-style batch and report all failures together
                failures.append({'dex': dex, 'species': row.get('species'), 'error': str(error)})
            if index == 1 or index % 25 == 0 or index == len(dex_ids):
                print(
                    'GENERATIONS_BATCH_PROGRESS',
                    json.dumps(
                        {
                            'done': index,
                            'total': len(dex_ids),
                            'built': len(reports),
                            'failed': len(failures),
                        }
                    ),
                    flush=True,
                )
    finally:
        for _, archive in packs.values():
            archive.close()

    manifest = {
        'schemaVersion': 1,
        'scope': '#001-386',
        'provider': 'Generations x Cobblemon',
        'animationPolicy': ['idle'],
        'requested': dex_ids,
        'built': len(reports),
        'failed': failures,
        'assets': reports,
    }
    manifest_path = args.output / 'manifest.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')), 'utf-8')

    total_bytes = sum(
        item['modelBytes'] + item['textureBytes'] + item['assetJsonBytes']
        for item in reports
    )
    print(
        'GENERATIONS_BATCH_DONE',
        json.dumps(
            {
                'requested': len(dex_ids),
                'built': len(reports),
                'failed': len(failures),
                'output': str(args.output),
                'webAssetBytes': total_bytes,
                'manifest': str(manifest_path),
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    if failures:
        print('GENERATIONS_BATCH_FAILURES', json.dumps(failures, ensure_ascii=False), flush=True)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
