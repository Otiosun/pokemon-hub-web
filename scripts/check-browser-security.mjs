import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAW_GITHUB_ORIGIN = 'https://raw.githubusercontent.com';
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "script-src-attr 'none'",
  "style-src 'self'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  `img-src 'self' blob: ${RAW_GITHUB_ORIGIN}`,
  `connect-src 'self' ${RAW_GITHUB_ORIGIN}`,
  "font-src 'self'",
  "media-src 'none'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

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
  ['Content-Security-Policy', CONTENT_SECURITY_POLICY],
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

const configuredAssetBaseUrl = process.env.VITE_POKEMON_ASSET_BASE_URL?.trim();
if (configuredAssetBaseUrl && /^https?:\/\//i.test(configuredAssetBaseUrl)) {
  const configuredOrigin = new URL(configuredAssetBaseUrl).origin;
  assert.ok(
    CONTENT_SECURITY_POLICY.includes(configuredOrigin),
    `VITE_POKEMON_ASSET_BASE_URL origin ${configuredOrigin} must be explicitly allowlisted in CSP before deployment`,
  );
}

const visualRegistry = readFileSync(new URL('../src/visual-assets/pokemonVisualRegistry.ts', import.meta.url), 'utf8');
assert.ok(
  visualRegistry.includes(`${RAW_GITHUB_ORIGIN}/`),
  'Pokemon visual registry external origin changed; review CSP allowlist',
);

const journeyPage = readFileSync(new URL('../src/features/journey/JourneyPageV2.tsx', import.meta.url), 'utf8');
assert.ok(journeyPage.includes('URL.createObjectURL'), 'local trainer image preview contract changed; review img-src blob:');

const generationsViewer = readFileSync(
  new URL('../src/features/asset-lab/GenerationsPokemonViewer.tsx', import.meta.url),
  'utf8',
);
assert.ok(generationsViewer.includes('DRACOLoader'), '3D decoder contract changed; review worker-src and WASM CSP');

console.log('BROWSER_SECURITY_CONTRACT_OK');
