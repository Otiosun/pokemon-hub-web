import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cardPath = fileURLToPath(new URL('./IncidentCenterCard.tsx', import.meta.url));
const appPath = fileURLToPath(new URL('../../App.tsx', import.meta.url));

describe('Incident Center wiring', () => {
  it('keeps incident inspection explicit, correlated, mutation-free and exposes contextual guidance progressively', async () => {
    const card = await readFile(cardPath, 'utf8');

    expect(card).toContain('getIncidentCenter');
    expect(card).toContain('Atualizar incidentes');
    expect(card).toContain('correlationId');
    expect(card).toContain('signal.runbook');
    expect(card).toContain('<details');
    expect(card).toContain('<summary>Ver runbook</summary>');
    expect(card).toContain('Evidências para coletar');
    expect(card).toContain('Escalonamento');
    expect(card).not.toContain('useEffect');
    expect(card).not.toContain('setInterval');
    expect(card).not.toMatch(/resolver|retry|reprocessar|compensar|replay|requeue/i);
    expect(card).not.toMatch(/payload|destinationRef|lastErrorCode|reason/i);
  });

  it('wires the Incident Center card to the authenticated Admin API client', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain('import { IncidentCenterCard }');
    expect(app).toContain('<IncidentCenterCard');
    expect(app).toContain('client={client}');
  });
});
