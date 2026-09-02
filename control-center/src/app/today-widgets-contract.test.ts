import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appPath = fileURLToPath(new URL('../App.tsx', import.meta.url));

describe('Control Center Today page contract', () => {
  it('surfaces F8.2 global player activity instead of the placeholder work queue', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain("activeSection === 'today'");
    expect(app).toContain('<TodayView');
    expect(app).toContain('className="metric-grid"');
    expect(app).toContain('PROGRESSO CANÔNICO');
    expect(app).toContain('PRINCIPAL');
    expect(app).toContain('PLAYER 360');
    expect(app).toContain('className="dashboard-grid"');
    expect(app).toContain('Atividade de jogadores');
    expect(app).toContain('Ativos 24h');
    expect(app).toContain('Ativos 7d');
    expect(app).toContain('Ativos 30d');
    expect(app).toContain('Retornaram em 7d');
    expect(app).toContain('getPlayerActivityAnalytics');
    expect(app).toContain('Estado operacional');
    expect(app).not.toContain('workQueue');
    expect(app).not.toContain('Fila de trabalho');
  });

  it('keeps the visible progress counter synchronized with the canonical Drive score', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain('const CANONICAL_PROGRESS = 49.2;');
    expect(app).not.toContain('const CANONICAL_PROGRESS = 48.6;');
  });
});
