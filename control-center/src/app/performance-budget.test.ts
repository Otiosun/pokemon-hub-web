import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Control Center performance contract', () => {
  it('keeps a build-time asset budget gate', () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.build).toContain('check-performance-budget');
  });

  it('lazy-loads the heavy Player 360 workspace behind Suspense', () => {
    const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

    expect(appSource).toContain('lazy(');
    expect(appSource).toContain('<Suspense');
    expect(appSource).toContain("import('./features/player360/Player360Page')");
  });
});
