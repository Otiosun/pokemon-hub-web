import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pagePath = fileURLToPath(new URL('./Player360Page.tsx', import.meta.url));

describe('Player 360 wallet adjust prepare wiring', () => {
  it('routes wallet.adjust to a dedicated prepare-only drawer', async () => {
    const source = await readFile(pagePath, 'utf8');

    expect(source).toContain(
      "import { WalletAdjustPrepareDrawer } from './WalletAdjustPrepareDrawer';",
    );
    expect(source).toContain("'wallet.adjust'");
    expect(source).toContain("action.operationType === 'wallet.adjust'");
    expect(source).toContain('<WalletAdjustPrepareDrawer');
    expect(source).toContain('onPrepareAction={openPrepareAction}');
    expect(source).not.toContain('simulateOperation(');
    expect(source).not.toContain('applyOperation(');
    expect(source).not.toContain('approveOperation(');
  });
});
