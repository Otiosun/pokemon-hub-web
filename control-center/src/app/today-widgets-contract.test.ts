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
    expect(app).not.toContain('workQueue');
    expect(app).not.toContain('Fila de trabalho');
  });

  it('surfaces F8.3 economy evidence only behind economy.read without adding dashboard controls', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain("const canReadEconomy = capabilities.has('economy.read');");
    expect(app).toContain('canReadEconomy={canReadEconomy}');
    expect(app).toContain('Economia agregada');
    expect(app).toContain('Fluxo líquido');
    expect(app).toContain('Saldo agregado');
    expect(app).toContain('Volume de inventário');
    expect(app).toContain('Anomalias de projeção');
    expect(app).toContain('getEconomyAnalytics');
    expect(app).toContain('Sem permissão economy.read.');
    expect(app).not.toContain('Estado operacional');
    expect(app).not.toContain('Exportar');
    expect(app).not.toContain('window=');
    expect(app).not.toContain('sourceType');
  });

  it('keeps the visible progress counter synchronized with the canonical Drive score', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain('const CANONICAL_PROGRESS = 49.8;');
    expect(app).not.toContain('const CANONICAL_PROGRESS = 49.2;');
  });
});
