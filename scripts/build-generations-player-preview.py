from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

# Current player-preview contract: every species that can be SEEN or CAUGHT in
# speciesPlayerStatePreview/ownedPokemonPreview must have a real 3D asset.
# UNKNOWN species deliberately do not expose 2D/3D controls.
PLAYER_VISIBLE_DEX = (
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 18, 19, 20, 22, 24, 25, 26,
    41, 58, 59, 63, 92, 94, 129, 131, 133, 134, 148, 149, 197, 245, 249, 384,
)

OUTPUT_ROOT = Path('public/research/generations')
DRACO_SOURCE = Path('node_modules/three/examples/jsm/libs/draco')
DRACO_OUTPUT = Path('public/research/draco')


def run_script(script: str, *args: str) -> None:
    subprocess.run([sys.executable, script, *args], check=True)


def main() -> None:
    # Resolve the authoritative semantic mapping first, then build only the
    # species that the current player-facing preview can actually reveal.
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

    missing = [
        dex
        for dex in PLAYER_VISIBLE_DEX
        if not any(
            (OUTPUT_ROOT / species / 'asset.json').exists()
            for species in _species_dirs_for_dex(dex)
        )
    ]
    if missing:
        raise RuntimeError(f'Player-preview 3D assets missing after build: {missing}')

    manifest_path = OUTPUT_ROOT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text('utf-8'))
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


def _species_dirs_for_dex(dex: int) -> list[str]:
    manifest_path = OUTPUT_ROOT / 'manifest.json'
    if not manifest_path.exists():
        return []
    manifest = json.loads(manifest_path.read_text('utf-8'))
    return [
        str(item['species'])
        for item in manifest.get('assets', [])
        if int(item.get('dex', -1)) == dex
    ]


if __name__ == '__main__':
    main()
