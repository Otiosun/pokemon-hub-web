import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface VercelProjectConfig {
  readonly $schema?: string;
  readonly framework?: string;
  readonly installCommand?: string;
  readonly buildCommand?: string;
  readonly outputDirectory?: string;
}

const vercelConfigPath = fileURLToPath(new URL('../../vercel.json', import.meta.url));

describe('Control Center dedicated deployment boundary', () => {
  it('is independently deployable from control-center with a frozen verified install', async () => {
    const config = JSON.parse(await readFile(vercelConfigPath, 'utf8')) as VercelProjectConfig;
    const installCommand = config.installCommand ?? '';
    const buildCommand = config.buildCommand ?? '';

    expect(config.$schema).toBe('https://openapi.vercel.sh/vercel.json');
    expect(config.framework).toBe('vite');
    expect(config.outputDirectory).toBe('dist');

    expect(installCommand).toContain('node scripts/materialize-lockfile.mjs');
    expect(installCommand).toContain('pnpm@11.23.0');
    expect(installCommand).toContain('pnpm install --frozen-lockfile');
    expect(installCommand).toContain('--ignore-scripts');
    expect(installCommand).not.toContain('--no-frozen-lockfile');
    expect(installCommand).not.toContain('--lockfile-only');

    expect(buildCommand).toContain('pnpm@11.23.0');
    expect(buildCommand).toContain('pnpm verify');
    expect(buildCommand).not.toContain('../');
  });
});
