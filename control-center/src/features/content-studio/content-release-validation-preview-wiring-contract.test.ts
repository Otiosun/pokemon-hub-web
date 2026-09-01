import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pagePath = fileURLToPath(new URL('./ContentLibraryPage.tsx', import.meta.url));

describe('Content Studio validation blocker wiring', () => {
  it('surfaces authoritative blockers only after an explicit read-only request', async () => {
    const source = await readFile(pagePath, 'utf8');

    expect(source).toContain("'previewContentReleaseValidation'");
    expect(source).toContain('client.previewContentReleaseValidation(release.releaseId)');
    expect(source).toContain('Ver bloqueios');
    expect(source).toContain('Nenhum bloqueio de validação encontrado');
    expect(source).toContain('Bloqueios encontrados');
    expect(source).toContain('issue.message');
    expect(source).toContain('issue.path');
    expect(source).not.toContain('useEffect');
    expect(source).not.toContain('client.validate');
    expect(source).not.toContain('simulateOperation(');
    expect(source).not.toContain('confirmOperation(');
    expect(source).not.toContain('approveOperation(');
    expect(source).not.toContain('applyOperation(');
  });
});
