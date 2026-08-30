import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tokensPath = fileURLToPath(new URL('./design-tokens.css', import.meta.url));
const globalStylesPath = fileURLToPath(new URL('../styles.css', import.meta.url));

describe('Control Center administrative design tokens', () => {
  it('defines and consumes semantic tokens for spacing, typography, surfaces, states, focus and motion', async () => {
    const tokens = await readFile(tokensPath, 'utf8');
    const styles = await readFile(globalStylesPath, 'utf8');

    const requiredTokens = [
      '--font-sans:',
      '--text-xs:',
      '--text-sm:',
      '--text-md:',
      '--space-1:',
      '--space-2:',
      '--space-3:',
      '--space-4:',
      '--surface-canvas:',
      '--surface-panel:',
      '--surface-raised:',
      '--state-success:',
      '--state-warning:',
      '--state-danger:',
      '--focus-ring-color:',
      '--focus-ring-width:',
      '--motion-fast:',
      '--motion-standard:',
      '--ease-standard:',
    ] as const;

    for (const token of requiredTokens) expect(tokens).toContain(token);

    expect(styles).toContain('font-family: var(--font-sans)');
    expect(styles).toContain('background: var(--surface-canvas)');
    expect(styles).toContain('var(--space-4)');
    expect(styles).toContain('var(--motion-fast)');
    expect(styles).toContain('var(--ease-standard)');
    expect(styles).toContain(':focus-visible');
    expect(styles).toContain('var(--focus-ring-color)');
  });
});
