import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { IncidentCenterView } from '../../lib/api/admin-api';
import { IncidentCenterCard } from './IncidentCenterCard';

const SNAPSHOT: IncidentCenterView = {
  signals: [
    {
      source: 'OUTBOX',
      id: '33333333-3333-4333-8333-333333333333',
      correlationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      state: 'DEAD',
      kind: 'OUTBOX_MESSAGE',
      targetType: null,
      targetId: null,
      riskTier: null,
      attempts: 8,
      occurredAt: '2026-09-01T13:00:00.000Z',
      runbook: {
        key: 'outbox-dead-letter',
        title: 'Mensagem em dead-letter',
        summary: 'Preserve o sinal para investigação.',
        steps: ['Confirme a correlação.'],
        evidenceToCollect: ['correlationId'],
        escalation: 'Escalone quando a investigação exigir recuperação autorizada.',
      },
    },
  ],
};

describe('Incident Center operational card', () => {
  it('starts unqueried and exposes only an explicit read refresh', () => {
    const html = renderToStaticMarkup(
      <IncidentCenterCard client={{ getIncidentCenter: async () => SNAPSHOT }} />,
    );

    expect(html).toContain('Incident Center');
    expect(html).toContain('Ainda não consultado');
    expect(html).toContain('Atualizar incidentes');
    expect(html).not.toMatch(/resolver|retry|reprocessar|compensar|runbook/i);
    expect(html).not.toMatch(/payload|destination|lastError|reason/i);
  });
});
