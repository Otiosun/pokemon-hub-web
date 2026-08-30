import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface RootPackageJson {
  readonly packageManager?: string;
  readonly scripts?: Readonly<Record<string, string>>;
}

const rootPackagePath = fileURLToPath(new URL('../../../package.json', import.meta.url));
const lockfilePath = fileURLToPath(new URL('../../pnpm-lock.yaml', import.meta.url));

describe('Control Center reproducible production install', () => {
  it('requires the pinned pnpm version to consume a committed frozen lockfile', async () => {
    const rootPackage = JSON.parse(await readFile(rootPackagePath, 'utf8')) as RootPackageJson;
    const postinstall = rootPackage.scripts?.postinstall ?? '';
    const lockfile = await readFile(lockfilePath, 'utf8');

    expect(rootPackage.packageManager).toBe('pnpm@11.23.0');
    expect(postinstall).toContain('pnpm install --frozen-lockfile');
    expect(postinstall).not.toContain('--no-frozen-lockfile');
    expect(postinstall).not.toContain('--lockfile-only');
    expect(lockfile).toMatch(/^lockfileVersion: '9\.0'/);
    expect(lockfile).toContain("specifier: 19.2.8");
    expect(lockfile).toContain('version: 19.2.8(react@19.2.8)');
  });
});
