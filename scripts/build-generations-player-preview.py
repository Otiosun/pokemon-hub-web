from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

# Production-candidate probe: build the complete Gen I-III catalog locally.
# This branch is intentionally validating whether the hosting/build limits can
# carry #001-386 without an external VITE_POKEMON_ASSET_BASE_URL.
PLAYER_VISIBLE_DEX = tuple(range(1, 387))

OUTPUT_ROOT = Path('public/research/generations')
REPORT_PATH = OUTPUT_ROOT / 'semantic-coverage-report.json'
DRACO_SOURCE = Path('node_modules/three/examples/jsm/libs/draco')
DRACO_OUTPUT = Path('public/research/draco')


def run_script(script: str, *args: str) -> None:
    subprocess.run([sys.executable, script, *args], check=True)


def main() -> None:
    # Verify already generates this report before the production asset step.
    # A plain npm build does not, so resolve the semantic mapping on demand.
    if not REPORT_PATH.exists():
        run_script('scripts/audit-generations-semantic.py')

    run_script(
        'scripts/build-generations-batch.py',
        '--dex',
        ','.join(str(dex) for dex in PLAYER_VISIBLE_DEX),
        '--output',
        str(OUTPUT_ROOT),
    )

    if not DRACO_SOURCE.exists():
        raise RuntimeError(f'Draco decoder directory missing: {DRACO_SOURCE}')
    if DRACO_OUTPUT.exists():
        shutil.rmtree(DRACO_OUTPUT)
    shutil.copytree(DRACO_SOURCE, DRACO_OUTPUT)

    manifest_path = OUTPUT_ROOT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text('utf-8'))
    built_by_dex = {int(item['dex']): str(item['species']) for item in manifest.get('assets', [])}
    missing = [dex for dex in PLAYER_VISIBLE_DEX if dex not in built_by_dex]
    if missing:
        raise RuntimeError(f'Player-preview 3D assets missing after build: {missing}')

    print(
        'PLAYER_PREVIEW_3D_COVERAGE',
        json.dumps(
            {
                'requested': len(PLAYER_VISIBLE_DEX),
                'built': manifest.get('built'),
                'failed': len(manifest.get('failed') or []),
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


if __name__ == '__main__':
    main()
