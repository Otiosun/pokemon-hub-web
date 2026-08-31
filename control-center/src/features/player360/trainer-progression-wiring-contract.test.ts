import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pagePath = fileURLToPath(new URL('./Player360Page.tsx', import.meta.url));

describe('Player 360 trainer progression prepare wiring', () => {
  it('routes progression.trainer.adjust to its dedicated prepare-only drawer', async () => {
    const source = await readFile(pagePath, 'utf8');

    expect(source).toContain(
      "import { TrainerProgressionPrepareDrawer } from './TrainerProgressionPrepareDrawer';",
    );
    expect(source).toContain("'battle.force_cancel' | 'progression.trainer.adjust' | null");
    expect(source).toContain("action.operationType === 'progression.trainer.adjust'");
    expect(source).toContain('<TrainerProgressionPrepareDrawer');
    expect(source).toContain('onPrepareAction={openPrepareAction}');
    expect(source).not.toContain('simulateOperation(');
    expect(source).not.toContain('applyOperation(');
    expect(source).not.toContain('approveOperation(');
  });
});
