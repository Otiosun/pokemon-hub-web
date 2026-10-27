import { describe, expect, it, vi } from 'vitest';
import {
  readManualDeliveryCatalog,
  readManualDeliveryHistory,
  submitManualDelivery,
} from './manualPremiumDeliveryClient';

const playerId = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const owner = '33333333-3333-4333-8333-333333333333';

describe('manual gamepass delivery UI contract', () => {
  it('reads only authoritative grantable products, without monetary fields', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            products: [
              {
                sku: '2XP',
                title: '2× XP',
                maxQuantity: 52,
                entitlementKey: 'XP_2X',
                grantModel: 'TIMED',
                durationSecondsPerUnit: 604800,
              },
            ],
          }),
          { status: 200 },
        ),
    );
    expect(await readManualDeliveryCatalog(fetcher)).toHaveLength(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/hub/admin/premium/delivery/catalog');
    expect(fetcher.mock.calls[0]?.[1]?.credentials).toBe('include');
  });

  it('does not send payment amounts or player-selected duration to backend', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            applied: true,
            replayed: false,
            requestId,
            entitlement: { playerId, entitlementKey: 'XP_2X' },
          }),
          { status: 201 },
        ),
    );
    expect(
      await submitManualDelivery(
        {
          requestId,
          playerId,
          sku: '2XP',
          quantity: 2,
          reason: 'Entrega aprovada externamente pelo administrador.',
        },
        fetcher,
      ),
    ).toEqual({ status: 'applied', replayed: false, requestId });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('/api/hub/admin/premium/delivery');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual({
      requestId,
      playerId,
      sku: '2XP',
      quantity: 2,
      reason: 'Entrega aprovada externamente pelo administrador.',
    });
  });

  it('does not treat a rejected, unauthorized or offline grant as delivered', async () => {
    for (const [status, outcome] of [
      [401, 'unauthenticated'],
      [403, 'forbidden'],
      [404, 'unavailable'],
      [503, 'unavailable'],
      [409, 'conflict'],
    ] as const) {
      const fetcher = vi.fn(async () => new Response(null, { status }));
      expect(
        (
          await submitManualDelivery(
            {
              requestId,
              playerId,
              sku: '2XP',
              quantity: 1,
              reason: 'Concessão já confirmada pelo administrador.',
            },
            fetcher,
          )
        ).status,
      ).toBe(outcome);
    }
  });

  it('distinguishes missing backend route from an unpublished commercial product', async () => {
    const input = {
      requestId,
      playerId,
      sku: 'LUCK',
      quantity: 1,
      reason: 'Pedido verificado externamente pelo administrador.',
    };
    const unpublished = await submitManualDelivery(
      input,
      async () =>
        new Response(JSON.stringify({ error: 'PRODUCT_UNAVAILABLE' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    );
    expect(unpublished).toMatchObject({ status: 'product-unavailable' });

    const routeAbsent = await submitManualDelivery(
      input,
      async () => new Response(null, { status: 404 }),
    );
    expect(routeAbsent).toMatchObject({ status: 'unavailable' });
  });

  it('reads the server-backed delivery audit trail and rejects malformed replies', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            deliveries: [
              {
                id: requestId,
                requestId,
                entitlementKey: 'XP_2X',
                actorPrincipalId: owner,
                durationSeconds: 604800,
                sku: '2XP',
                quantity: 1,
                reason: 'Entrega confirmada',
                createdAt: '2026-10-19T12:00:00.000Z',
              },
            ],
          }),
          { status: 200 },
        ),
    );
    expect((await readManualDeliveryHistory(playerId, fetcher))[0]?.actorPrincipalId).toBe(owner);
    expect(fetcher.mock.calls[0]?.[0]).toContain('resource=deliveries');
    await expect(readManualDeliveryHistory('not-uuid', fetcher)).rejects.toThrow();
  });
});
