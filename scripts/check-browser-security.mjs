import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
assert.match(viteConfig, /sourcemap:\s*false/, 'production source maps must be disabled');
assert.doesNotMatch(viteConfig, /sourcemap:\s*true/, 'production source maps must not be enabled');

const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const vercelGlobalRule = vercelConfig.headers?.find((rule) => rule.source === '/(.*)');
const vercelHeaders = new Map(vercelGlobalRule?.headers?.map(({ key, value }) => [key, value]) ?? []);

const sharedHeaders = new Map([
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['X-Frame-Options', 'DENY'],
]);

for (const [key, value] of sharedHeaders) {
  assert.equal(vercelHeaders.get(key), value, `Vercel must set ${key}`);
}
assert.equal(
  vercelHeaders.has('Strict-Transport-Security'),
  false,
  'Vercel HSTS must remain provider-managed so the repo does not weaken the platform policy',
);

const cloudflareHeadersPath = fileURLToPath(new URL('../public/_headers', import.meta.url));
assert.ok(existsSync(cloudflareHeadersPath), 'public/_headers must exist for Cloudflare static assets');
const cloudflareHeaders = readFileSync(cloudflareHeadersPath, 'utf8');
assert.match(cloudflareHeaders, /^\/\*/m, 'Cloudflare security headers must apply to all static asset paths');
for (const [key, value] of sharedHeaders) {
  assert.ok(cloudflareHeaders.includes(`${key}: ${value}`), `Cloudflare must set ${key}`);
}
assert.ok(
  cloudflareHeaders.includes('Strict-Transport-Security: max-age=31536000'),
  'Cloudflare static assets must emit HSTS',
);

console.log('BROWSER_SECURITY_CONTRACT_OK');
