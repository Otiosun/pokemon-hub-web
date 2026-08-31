import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pagePath = fileURLToPath(new URL('./Player360Page.tsx', import.meta.url));

describe('Player 360 encounter close prepare wiring', () => {
  it('connects the contextual rail to the explicit prepare-only drawer without opening later lifecycle', async () => {
    const source = await readFile(pagePath, 'utf8');

    expect(source).toContain(
      "import { EncounterClosePrepareDrawer } from './EncounterClosePrepareDrawer';",
    );
    expect(source).toContain("| 'encounter.close'");
    expect(source).toContain("action.operationType === 'encounter.close'");
    expect(source).toContain("setPrepareActionOpen('encounter.close')");
    expect(source).toContain('onPrepareAction={openPrepareAction}');
    expect(source).toContain('<EncounterClosePrepareDrawer');
    expect(source).toContain('client={client}');
    expect(source).not.toContain('simulateOperation(');
    expect(source).not.toContain('confirmOperation(');
    expect(source).not.toContain('approveOperation(');
    expect(source).not.toContain('applyOperation(');
  });
});
