import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const tokensPath = fileURLToPath(new URL('./design-tokens.css', import.meta.url));
const playerPagePath = fileURLToPath(
  new URL('../features/player360/Player360Page.tsx', import.meta.url),
);
const playerRuntimeCssPath = fileURLToPath(
  new URL('../features/player360/player360-runtime.css', import.meta.url),
);
const sidebarPath = fileURLToPath(
  new URL('../components/shell/ControlCenterSidebar.tsx', import.meta.url),
);

describe('Control Center keyboard and focus contract', () => {
  it('uses native keyboard controls without suppressing the semantic focus ring', async () => {
    const [tokens, playerPage, playerCss, sidebar] = await Promise.all([
      readFile(tokensPath, 'utf8'),
      readFile(playerPagePath, 'utf8'),
      readFile(playerRuntimeCssPath, 'utf8'),
      readFile(sidebarPath, 'utf8'),
    ]);

    const playerFocusBlock =
      playerCss.match(/\.player-result:hover,\s*\.player-result:focus-visible\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(tokens).toContain('--focus-ring-color:');
    expect(tokens).toContain('--focus-ring-width:');
    expect(tokens).toContain('--focus-ring-offset:');
    expect(tokens).toContain(':focus-visible');
    expect(playerPage).toContain('<button');
    expect(playerPage).toContain('className={`player-result');
    expect(sidebar).toContain('<button');
    expect(sidebar).toContain('className={`nav-item');
    expect(playerFocusBlock).not.toContain('outline: none');
    expect(playerFocusBlock).toContain(
      'outline: var(--focus-ring-width) solid var(--focus-ring-color)',
    );
    expect(playerFocusBlock).toContain('outline-offset: var(--focus-ring-offset)');
  });
});
