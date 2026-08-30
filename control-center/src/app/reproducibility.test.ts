import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

interface RootPackageJson {
  readonly packageManager?: string;
  readonly scripts?: Readonly<Record<string, string>>;
}

const EXPECTED_LOCKFILE_SHA256 = 'dcacde6be17cf53c6c8acaa08f1715c0e25afc1f5fdc4c27300edd4862241e72';
const rootPackagePath = fileURLToPath(new URL('../../../package.json', import.meta.url));
const lockSourcePath = fileURLToPath(new URL('../../pnpm-lock.yaml.gz.b64', import.meta.url));

describe('Control Center reproducible production install', () => {
  it('requires pinned pnpm to verify a committed lock source and install it frozen', async () => {
    const rootPackage = JSON.parse(await readFile(rootPackagePath, 'utf8')) as RootPackageJson;
    const postinstall = rootPackage.scripts?.postinstall ?? '';
    const verifyControlCenter = rootPackage.scripts?.['verify:control-center'] ?? '';
    const encodedSource = (await readFile(lockSourcePath, 'utf8')).trim();
    const lockfile = gunzipSync(Buffer.from(encodedSource, 'base64'));
    const lockfileSha256 = createHash('sha256').update(lockfile).digest('hex');
    const lockfileText = lockfile.toString('utf8');

    expect(rootPackage.packageManager).toBe('pnpm@11.23.0');
    expect(postinstall).toContain('control-center/scripts/materialize-lockfile.mjs');
    expect(postinstall).toContain('pnpm --dir control-center install --frozen-lockfile');
    expect(postinstall).toContain('--ignore-scripts');
    expect(postinstall).not.toContain('--no-frozen-lockfile');
    expect(postinstall).not.toContain('--lockfile-only');
    expect(postinstall).not.toContain('LOCKFILE_GZIP');
    expect(verifyControlCenter).toContain('pnpm --dir control-center verify');
    expect(lockfileSha256).toBe(EXPECTED_LOCKFILE_SHA256);
    expect(lockfileText).toMatch(/^lockfileVersion: '9\.0'/);
    expect(lockfileText).toContain('specifier: 19.2.8');
    expect(lockfileText).toContain('version: 19.2.8(react@19.2.8)');
  });
});
