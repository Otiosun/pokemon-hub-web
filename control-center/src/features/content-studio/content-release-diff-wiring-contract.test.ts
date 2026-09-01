import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pagePath = fileURLToPath(new URL('./ContentLibraryPage.tsx', import.meta.url));

describe('Content Studio release diff wiring', () => {
  it('connects unpublished releases to an explicit read-only human diff without lifecycle actions', async () => {
    const source = await readFile(pagePath, 'utf8');

    expect(source).toContain("'diffContentRelease'");
    expect(source).toContain('client.diffContentRelease({');
    expect(source).toContain('fromReleaseId: release.parentReleaseId');
    expect(source).toContain('toReleaseId: release.releaseId');
    expect(source).toContain('release.parentReleaseId === null');
    expect(source).toContain('Ver alterações');
    expect(source).toContain('adicionados');
    expect(source).toContain('removidos');
    expect(source).toContain('alterados');
    expect(source).not.toContain('useEffect');
    expect(source).not.toContain('simulateOperation(');
    expect(source).not.toContain('confirmOperation(');
    expect(source).not.toContain('approveOperation(');
    expect(source).not.toContain('applyOperation(');
  });
});
