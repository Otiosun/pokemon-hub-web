import { describe, expect, it } from 'vitest';
import vercelConfig from '../../vercel.json';

describe('deployment integrity', () => {
  it('does not couple the public app to a branch-specific Cloudflare diagnostic route', () => {
    const serialized = JSON.stringify(vercelConfig);

    expect(serialized).not.toContain('__cloudflare-probe');
    expect(serialized).not.toContain('feat-pokemon-detail-v1');
    expect(serialized).not.toContain('deploy-probe-v3.txt');
  });

  it('allows the browser to load National Dex metadata from PokeAPI', () => {
    const serialized = JSON.stringify(vercelConfig);

    expect(serialized).toContain("connect-src 'self' blob: https://raw.githubusercontent.com https://pokeapi.co");
  });
});
