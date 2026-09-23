import { spawnSync } from 'node:child_process';

export function generationsBuildMode(env = process.env) {
  const explicit = env.GENERATIONS_BUILD_MODE?.trim().toLowerCase();
  if (explicit === 'full' || explicit === 'skip') return explicit;

  // Vercel serves the immutable Gen I-III catalog through external rewrites.
  // Keep application deploys independent from the expensive 386-model rebuild.
  if (env.VERCEL === '1') return 'skip';

  if (env.WORKERS_CI === '1') {
    const branch = env.WORKERS_CI_BRANCH?.trim();
    if (branch && branch !== 'main') return 'skip';
  }

  return 'full';
}

function runFullBuild() {
  const result = spawnSync(process.execPath, ['scripts/run-generations-player-preview.mjs'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (generationsBuildMode() === 'skip') {
  console.log(
    'PLAYER_PREVIEW_3D_COVERAGE',
    JSON.stringify({
      mode: 'preview-skip',
      branch:
        process.env.WORKERS_CI_BRANCH ??
        process.env.VERCEL_GIT_COMMIT_REF ??
        null,
    }),
  );
} else {
  runFullBuild();
}
