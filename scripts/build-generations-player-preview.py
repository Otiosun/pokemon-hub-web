from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

# Deployment-local fallback used while the complete immutable catalog is not
# hosted behind VITE_POKEMON_ASSET_BASE_URL. Keep the active showcase team and
# the representative converter coverage here; this is not the full Gen I-III
# production catalog.
PLAYER_VISIBLE_DEX = (
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 18, 19, 20, 22, 24, 25, 26,
    41, 58, 59, 63, 92, 94, 129, 131, 133, 134, 148, 149, 197, 245, 248, 249,
    376, 384,
)

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
