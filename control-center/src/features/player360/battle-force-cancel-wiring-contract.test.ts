import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pagePath = fileURLToPath(new URL('./Player360Page.tsx', import.meta.url));

describe('Player 360 battle force-cancel prepare wiring', () => {
  it('connects the contextual rail to the prepare-only drawer without opening later lifecycle', async () => {
    const source = await readFile(pagePath, 'utf8');

    expect(source).toContain("import { BattleForceCancelPrepareDrawer } from './BattleForceCancelPrepareDrawer';");
    expect(source).toContain("'searchPlayers' | 'getPlayer' | 'prepareOperation'");
    expect(source).toContain('onPrepareAction={openPrepareAction}');
    expect(source).toContain('<BattleForceCancelPrepareDrawer');
    expect(source).toContain('client={client}');
    expect(source).not.toContain('simulateOperation(');
    expect(source).not.toContain('applyOperation(');
    expect(source).not.toContain('approveOperation(');
  });
});
