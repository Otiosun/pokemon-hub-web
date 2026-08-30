import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appPath = fileURLToPath(new URL('../App.tsx', import.meta.url));
const stylesPath = fileURLToPath(new URL('../styles.css', import.meta.url));

describe('Control Center responsive shell contract', () => {
  it('mounts the authenticated app on the root class owned by responsive shell CSS', async () => {
    const app = await readFile(appPath, 'utf8');
    const styles = await readFile(stylesPath, 'utf8');

    expect(app).toContain('className="control-center"');
    expect(styles).toContain('.control-center {');
    expect(styles).toContain('@media (max-width: 1080px)');
    expect(styles).toContain('grid-template-columns: 80px minmax(0, 1fr)');
    expect(styles).toContain('@media (max-width: 720px)');
    expect(styles).toContain('position: fixed');
    expect(styles).toContain('bottom: 0');
    expect(app).toContain('<header className="topbar">');
  });
});
