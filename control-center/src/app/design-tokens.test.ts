import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tokensPath = fileURLToPath(new URL('./design-tokens.css', import.meta.url));
const mainPath = fileURLToPath(new URL('../main.tsx', import.meta.url));

describe('Control Center administrative design tokens', () => {
  it('defines and consumes semantic tokens for spacing, typography, surfaces, states, focus and motion', async () => {
    const tokens = await readFile(tokensPath, 'utf8');
    const main = await readFile(mainPath, 'utf8');

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

    expect(main).toContain("import './app/design-tokens.css';");
    expect(tokens).toContain('font-family: var(--font-sans)');
    expect(tokens).toContain('background: var(--surface-canvas)');
    expect(tokens).toContain('--bg: var(--surface-canvas)');
    expect(tokens).toContain('--surface: var(--surface-panel)');
    expect(tokens).toContain('--good: var(--state-success)');
    expect(tokens).toContain('var(--motion-fast)');
    expect(tokens).toContain('var(--ease-standard)');
    expect(tokens).toContain(':focus-visible');
    expect(tokens).toContain('var(--focus-ring-color)');
    expect(tokens).toContain('prefers-reduced-motion');
  });
});
