import { describe, expect, it, vi } from 'vitest';
import { deliverMasterBallPack, readMasterBallCatalog } from './manualPremiumMasterBallClient';

const requestId = '11111111-1111-4111-8111-111111111111';
const playerId = '22222222-2222-4222-8222-222222222222';
const itemId = '33333333-3333-4333-8333-333333333333';
const operationId = '44444444-4444-4444-8444-444444444444';
const input = { requestId, playerId, quantity: 2, reason: 'Entrega autorizada após atendimento.' };
const path = '/api/hub/admin/premium/delivery/packs/master';

describe('MASTER SKU manual delivery (no payment integration)', () => {
  it('requires an exact published item before presenting the action', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            sku: 'MASTER',
            quantityPerUnit: 1,
            maxQuantity: 20,
            available: true,
            item: { itemId, displayName: 'Master Ball' },
          }),
          { status: 200 },
        ),
    );
    expect((await readMasterBallCatalog(fetcher)).item?.itemId).toBe(itemId);
    expect(fetcher).toHaveBeenCalledWith(
      path,
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }),
    );
    const absent = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            sku: 'MASTER',
            quantityPerUnit: 1,
            maxQuantity: 20,
            available: false,
            item: null,
          }),
          { status: 200 },
        ),
    );
    expect((await readMasterBallCatalog(absent)).available).toBe(false);
    const malformed = vi.fn(
      async () => new Response(JSON.stringify({ available: true, item: null })),
    );
    await expect(readMasterBallCatalog(malformed)).rejects.toThrow();
  });
  it('sends only the canonical MASTER grant, not payments or client item IDs', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            ...input,
            sku: 'MASTER',
            itemId,
            operationId,
            applied: true,
            replayed: false,
          }),
          { status: 201 },
        ),
    );
    expect(await deliverMasterBallPack(input, fetcher)).toEqual({
      kind: 'APPLIED',
      replayed: false,
      operationId,
    });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(path);
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual({ ...input, sku: 'MASTER' });
    expect(String(init?.body)).not.toMatch(/paid|payment|amountCents|itemId|orderId/);
  });
  it('never announces an uncertain response or an unpublished ball as delivered', async () => {
    const unpublished = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'MASTER_BALL_NOT_PUBLISHED' }), { status: 409 }),
    );
    expect(await deliverMasterBallPack(input, unpublished)).toEqual({
      kind: 'ERROR',
      code: 'NOT_PUBLISHED',
    });
    for (const [status, code] of [
      [401, 'UNAUTHORIZED'],
      [403, 'FORBIDDEN'],
      [503, 'UNAVAILABLE'],
      [409, 'REJECTED'],
    ] as const) {
      const fetcher = vi.fn(async () => new Response(null, { status }));
      expect(await deliverMasterBallPack(input, fetcher)).toEqual({ kind: 'ERROR', code });
    }
    const incomplete = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ...input,
            sku: 'MASTER',
            applied: true,
            replayed: false,
          }),
          { status: 201 },
        ),
    );
    await expect(deliverMasterBallPack(input, incomplete)).rejects.toThrow(/incerto/);
  });
  it('rejects forbidden quantities and invalid UUIDs before fetching', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    await expect(deliverMasterBallPack({ ...input, quantity: 21 }, fetcher)).rejects.toThrow();
    await expect(deliverMasterBallPack({ ...input, quantity: 0 }, fetcher)).rejects.toThrow();
    await expect(
      deliverMasterBallPack({ ...input, playerId: 'unknown' }, fetcher),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
