import { spawnSync } from 'node:child_process';

export function generationsBuildMode(env = process.env) {
  const explicit = env.GENERATIONS_BUILD_MODE?.trim().toLowerCase();
  if (explicit === 'full' || explicit === 'skip') return explicit;

  // A real Cloudflare Workers Build has a build UUID. Keep those builds
  // fail-closed by generating the complete 3D catalog even for PR branches.
  if (env.WORKERS_CI === '1' && env.WORKERS_CI_BUILD_UUID?.trim()) return 'full';

  // Synthetic/local branch checks may skip the expensive catalog regeneration.
  if (env.WORKERS_CI === '1') {
    const branch = env.WORKERS_CI_BRANCH?.trim();
    if (branch && branch !== 'main') return 'skip';
  }

  if (env.VERCEL_ENV === 'preview') return 'skip';

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
