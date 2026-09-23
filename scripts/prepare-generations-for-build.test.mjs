import { describe, expect, it } from 'vitest';
import { generationsBuildMode } from './prepare-generations-for-build.mjs';

describe('Generations deployment build mode', () => {
  it('keeps the complete catalog gate on production and local builds', () => {
    expect(generationsBuildMode({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' })).toBe('full');
    expect(generationsBuildMode({ VERCEL_ENV: 'production' })).toBe('full');
    expect(generationsBuildMode({})).toBe('full');
  });

  it('keeps real Cloudflare Workers builds on the complete catalog gate', () => {
    expect(
      generationsBuildMode({
        WORKERS_CI: '1',
        WORKERS_CI_BRANCH: 'feat/admin-player-adjustments-v2',
        WORKERS_CI_BUILD_UUID: 'db1aaf55-b8e1-49aa-ae1f-c780312e2195',
      }),
    ).toBe('full');
  });

  it('skips expensive catalog regeneration on synthetic branch previews', () => {
    expect(
      generationsBuildMode({
        WORKERS_CI: '1',
        WORKERS_CI_BRANCH: 'fix/vercel-admin-proxy-consolidation-v1',
      }),
    ).toBe('skip');
    expect(generationsBuildMode({ VERCEL_ENV: 'preview' })).toBe('skip');
  });

  it('supports an explicit override for asset-specific validation', () => {
    expect(
      generationsBuildMode({
        WORKERS_CI: '1',
        WORKERS_CI_BRANCH: 'feature/3d',
        GENERATIONS_BUILD_MODE: 'full',
      }),
    ).toBe('full');
    expect(generationsBuildMode({ GENERATIONS_BUILD_MODE: 'skip' })).toBe('skip');
  });
});
