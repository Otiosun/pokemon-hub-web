import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appPath = fileURLToPath(new URL('../App.tsx', import.meta.url));

describe('Control Center Today page contract', () => {
  it('provides an operational widget structure before every data source is live', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain("activeSection === 'today'");
    expect(app).toContain('<TodayView');
    expect(app).toContain('className="metric-grid"');
    expect(app).toContain('PROGRESSO CANÔNICO');
    expect(app).toContain('PRINCIPAL');
    expect(app).toContain('PLAYER 360');
    expect(app).toContain('className="dashboard-grid"');
    expect(app).toContain('Fila de trabalho');
    expect(app).toContain('Estado operacional');
    expect(app).toContain('workQueue.map');
  });

  it('keeps the visible progress counter synchronized with the canonical Drive score', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain('const CANONICAL_PROGRESS = 48.6;');
    expect(app).not.toContain('const CANONICAL_PROGRESS = 48.5;');
  });
});
