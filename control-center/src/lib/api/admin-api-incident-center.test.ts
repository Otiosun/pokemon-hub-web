import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient, AdminApiError } from './admin-api';

const API_BASE_URL = 'https://admin-api.example.test';
const snapshot = {
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
        summary:
          'Trate o sinal como evidência persistente e preserve o estado para investigação antes de qualquer recuperação autorizada.',
        steps: [
          'Confirme correlationId, total de tentativas e horário de entrada em estado DEAD.',
          'Compare o sinal com os metadados de dead-letter e com a saúde do runtime.',
          'Documente a recorrência e encaminhe a recuperação para o fluxo privilegiado apropriado, fora desta superfície.',
        ],
        evidenceToCollect: [
          'correlationId',
          'attempts',
          'occurredAt',
          'dead-letter metadata',
          'runtime health',
        ],
        escalation:
          'Escalone para o responsável pelo fluxo de recuperação; a Central permanece somente observacional neste runbook.',
      },
    },
  ],
} as const;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-correlation-id': 'corr-incident-center' },
  });
}

describe('AdminApiClient Incident Center', () => {
  it('reads the exact Incident Center endpoint with credentials and an allowlisted contextual runbook', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(snapshot));
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    await expect(client.getIncidentCenter()).resolves.toEqual(snapshot);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${API_BASE_URL}/admin/v1/incidents`);
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', credentials: 'include' });
  });

  it.each([
    { signals: [{ ...snapshot.signals[0], source: 'DATABASE' }] },
    { signals: [{ ...snapshot.signals[0], state: 'OPEN' }] },
    { signals: [{ ...snapshot.signals[0], correlationId: 'not-a-uuid' }] },
    { signals: [{ ...snapshot.signals[0], occurredAt: '' }] },
    { signals: [{ ...snapshot.signals[0], payload: 'must-not-be-accepted' }] },
    { signals: [{ ...snapshot.signals[0], reason: 'must-not-be-accepted' }] },
    { signals: [{ ...snapshot.signals[0], lastErrorCode: 'must-not-be-accepted' }] },
    { signals: [{ ...snapshot.signals[0], runbook: { ...snapshot.signals[0].runbook, command: 'retry' } }] },
    { signals: [{ ...snapshot.signals[0], runbook: { ...snapshot.signals[0].runbook, url: 'https://example.test' } }] },
    { signals: [{ ...snapshot.signals[0], runbook: { ...snapshot.signals[0].runbook, action: 'requeue' } }] },
    { signals: [{ ...snapshot.signals[0], runbook: { ...snapshot.signals[0].runbook, steps: [] } }] },
    { signals: [{ ...snapshot.signals[0], runbook: { ...snapshot.signals[0].runbook, key: 'outbox-delivery-failed' } }] },
    { ...snapshot, environment: 'production' },
  ])('fails closed on malformed or expanded Incident Center payload %#', async (body) => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(body));
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    const request = client.getIncidentCenter();
    await expect(request).rejects.toBeInstanceOf(AdminApiError);
    await expect(request).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_INCIDENT_CENTER_RESPONSE',
    });
  });
});
