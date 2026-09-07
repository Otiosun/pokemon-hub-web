import { describe, expect, it } from 'vitest';
import vercelConfig from '../../vercel.json';
import viteConfigSource from '../../vite.config.ts?raw';

const REQUIRED_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000',
} as const;

function getVercelGlobalHeaders(): Map<string, string> {
  const globalRule = vercelConfig.headers.find((rule) => rule.source === '/(.*)');
  return new Map(globalRule?.headers.map(({ key, value }) => [key, value]) ?? []);
}

describe('deployment integrity', () => {
  it('does not couple the public app to a branch-specific Cloudflare diagnostic route', () => {
    const serialized = JSON.stringify(vercelConfig);

    expect(serialized).not.toContain('__cloudflare-probe');
    expect(serialized).not.toContain('feat-pokemon-detail-v1');
    expect(serialized).not.toContain('deploy-probe-v3.txt');
  });

  it('does not publish production source maps', () => {
    expect(viteConfigSource).toMatch(/sourcemap:\s*false/);
    expect(viteConfigSource).not.toMatch(/sourcemap:\s*true/);
  });

  it('pins the baseline browser security headers on Vercel', () => {
    const headers = getVercelGlobalHeaders();

    for (const [key, value] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
      expect(headers.get(key), key).toBe(value);
    }
  });

  it('mirrors the baseline browser security headers for Cloudflare static assets', () => {
    const cloudflareHeaderModules = import.meta.glob('../../public/_headers', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;
    const cloudflareHeaders = cloudflareHeaderModules['../../public/_headers'];

    expect(cloudflareHeaders, 'public/_headers').toBeDefined();
    if (!cloudflareHeaders) return;

    expect(cloudflareHeaders).toContain('/*');
    for (const [key, value] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
      expect(cloudflareHeaders).toContain(`${key}: ${value}`);
    }
  });
});
