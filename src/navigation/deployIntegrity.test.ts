import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import vercelConfig from '../../vercel.json';

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
    const viteConfigPath = fileURLToPath(new URL('../../vite.config.ts', import.meta.url));
    const viteConfigSource = readFileSync(viteConfigPath, 'utf8');

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
    const cloudflareHeadersPath = fileURLToPath(new URL('../../public/_headers', import.meta.url));

    expect(() => readFileSync(cloudflareHeadersPath, 'utf8')).not.toThrow();
    if (!existsSync(cloudflareHeadersPath)) return;

    const cloudflareHeaders = readFileSync(cloudflareHeadersPath, 'utf8');
    expect(cloudflareHeaders).toContain('/*');
    for (const [key, value] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
      expect(cloudflareHeaders).toContain(`${key}: ${value}`);
    }
  });
});
