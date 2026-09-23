import { describe, expect, it } from 'vitest';
import { generationsBuildMode } from './prepare-generations-for-build.mjs';

describe('Generations deployment build mode', () => {
  it('keeps the complete catalog gate on Cloudflare main and local builds', () => {
    expect(generationsBuildMode({ WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' })).toBe('full');
    expect(generationsBuildMode({})).toBe('full');
  });

  it('skips expensive catalog regeneration on Vercel and branch previews', () => {
    expect(generationsBuildMode({ VERCEL: '1', VERCEL_ENV: 'production' })).toBe('skip');
    expect(generationsBuildMode({ VERCEL: '1', VERCEL_ENV: 'preview' })).toBe('skip');
    expect(
      generationsBuildMode({
        WORKERS_CI: '1',
        WORKERS_CI_BRANCH: 'fix/vercel-admin-proxy-consolidation-v1',
      }),
    ).toBe('skip');
  });

  it('supports an explicit override for asset-specific validation', () => {
    expect(
      generationsBuildMode({
        VERCEL: '1',
        VERCEL_ENV: 'production',
        GENERATIONS_BUILD_MODE: 'full',
      }),
    ).toBe('full');
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
