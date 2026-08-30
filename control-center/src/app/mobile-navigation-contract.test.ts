import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const stylesPath = fileURLToPath(new URL('../styles.css', import.meta.url));

describe('Control Center mobile navigation contract', () => {
  it('switches from desktop sidebar layout to viewport-native bottom navigation', async () => {
    const styles = await readFile(stylesPath, 'utf8');
    const mobile = styles.split('@media (max-width: 720px)')[1] ?? '';

    expect(mobile).toContain('.control-center {');
    expect(mobile).toContain('display: block');
    expect(mobile).toContain('padding-bottom: 70px');
    expect(mobile).toContain('.sidebar {');
    expect(mobile).toContain('position: fixed');
    expect(mobile).toContain('bottom: 0');
    expect(mobile).toContain('left: 0');
    expect(mobile).toContain('right: 0');
    expect(mobile).toContain('width: 100%');
    expect(mobile).toContain('.primary-nav {');
    expect(mobile).toContain('display: grid');
    expect(mobile).toContain('.nav-description {');
    expect(mobile).toContain('display: none');
  });
});
