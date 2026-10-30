import { describe, expect, it, vi } from 'vitest';
import { getAdminAudit } from './playerPortalAdminAuditClient';

function response(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('player portal admin audit client', () => {
  it('reads human-facing audit entries without requiring raw operation payloads', async () => {
    const fetcher = vi.fn(() =>
      response(200, {
        entries: [
          {
            operationId: '00000000-0000-4000-8000-000000000111',
            operationType: 'wallet.adjust',
            actorDisplayName: 'Equipe Beyond',
            targetType: 'PLAYER',
            riskTier: 2,
            status: 'APPLIED',
            reason: 'Correção de evento',
            createdAt: '2026-09-26T05:00:00.000Z',
            appliedAt: '2026-09-26T05:00:01.000Z',
          },
        ],
      }),
    );

    await expect(getAdminAudit(30, fetcher as typeof fetch)).resolves.toEqual({
      status: 'ok',
      entries: [
        expect.objectContaining({
          actorDisplayName: 'Equipe Beyond',
          operationType: 'wallet.adjust',
          status: 'APPLIED',
        }),
      ],
    });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/hub/admin/audit?limit=30',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('keeps audit hidden when the backend denies the capability', async () => {
    await expect(getAdminAudit(100, () => response(403, { error: 'FORBIDDEN' }))).resolves.toEqual({
      status: 'forbidden',
    });
  });

  it('rejects malformed history instead of rendering untrusted data', async () => {
    await expect(
      getAdminAudit(100, () =>
        response(200, {
          entries: [
            {
              operationId: 'not-an-id',
              operationType: 'wallet.adjust',
              actorDisplayName: 'Admin',
              targetType: 'PLAYER',
              riskTier: 9,
              status: 'APPLIED',
              reason: null,
              createdAt: 'never',
              appliedAt: null,
            },
          ],
        }),
      ),
    ).rejects.toThrow('Invalid admin audit response');
  });
});
