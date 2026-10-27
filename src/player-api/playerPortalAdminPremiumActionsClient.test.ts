import { describe, expect, it, vi } from 'vitest';
import { submitManualPremiumAction } from './playerPortalAdminPremiumActionsClient';

const orderId = '88888888-8888-4888-8888-888888888888';
const requestId = '99999999-9999-4999-8999-999999999999';
const input = {
  requestId,
  humanId: 'PB-00000001',
  expectedRevision: '0',
  reason: 'Admin conferiu e aprovou manualmente.',
  confirmed: true as const,
};

describe('owner Premium actions client', () => {
  it('submits only a manually confirmed decision without client payment or player fields', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ operation: 'PAYMENT_APPROVED', replayed: false }), {
          status: 200,
        }),
    );
    expect(await submitManualPremiumAction(orderId, 'approve', input, fetcher)).toEqual({
      status: 'ok',
      operation: 'PAYMENT_APPROVED',
      replayed: false,
    });
    const [url, request] = fetcher.mock.calls[0]!;
    expect(url).toBe(`/api/hub/admin/premium/orders/${orderId}/approve`);
    expect(request?.method).toBe('POST');
    expect(request?.credentials).toBe('include');
    expect(JSON.parse(String(request?.body))).toEqual(input);
  });
  it('requires server-confirmed fulfillment for delivery', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ operation: '2XP_DELIVERED', replayed: true }), {
          status: 200,
        }),
    );
    expect((await submitManualPremiumAction(orderId, 'deliver', input, fetcher)).status).toBe('ok');
    const forged = vi.fn(
      async () =>
        new Response(JSON.stringify({ operation: 'PAYMENT_APPROVED', replayed: false }), {
          status: 200,
        }),
    );
    await expect(submitManualPremiumAction(orderId, 'deliver', input, forged)).rejects.toThrow();
  });
  it('does not report success on missing backend or stale payment decisions', async () => {
    for (const [code, status] of [
      [401, 'unauthenticated'],
      [403, 'forbidden'],
      [404, 'unavailable'],
      [409, 'stale'],
      [503, 'unavailable'],
    ] as const) {
      const fetcher = vi.fn(async () => new Response(null, { status: code }));
      const result = await submitManualPremiumAction(orderId, 'approve', input, fetcher);
      expect(result.status).toBe(status);
    }
  });
  it('refuses unreviewed or injected data without touching the network', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    await expect(
      submitManualPremiumAction(
        orderId,
        'approve',
        { ...input, confirmed: false as never },
        fetcher,
      ),
    ).rejects.toThrow();
    await expect(submitManualPremiumAction('bad-id', 'deliver', input, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
