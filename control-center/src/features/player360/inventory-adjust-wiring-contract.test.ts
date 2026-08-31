import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pagePath = fileURLToPath(new URL('./Player360Page.tsx', import.meta.url));

describe('Player 360 inventory adjust prepare wiring', () => {
  it('routes inventory.adjust to its dedicated prepare-only drawer', async () => {
    const source = await readFile(pagePath, 'utf8');

    expect(source).toContain(
      "import { InventoryAdjustPrepareDrawer } from './InventoryAdjustPrepareDrawer';",
    );
    expect(source).toContain("'inventory.adjust'");
    expect(source).toContain("action.operationType === 'inventory.adjust'");
    expect(source).toContain("prepareActionOpen === 'inventory.adjust'");
    expect(source).toContain('<InventoryAdjustPrepareDrawer');
    expect(source).toContain('onPrepareAction={openPrepareAction}');
    expect(source).not.toContain('simulateOperation(');
    expect(source).not.toContain('applyOperation(');
    expect(source).not.toContain('approveOperation(');
  });
});
