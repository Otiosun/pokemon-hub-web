import { describe, expect, it, vi } from 'vitest';
import { readDeliveryInventoryCatalog, deliverPublishedInventoryItem } from './manualPremiumInventoryClient';

const requestId = '11111111-1111-4111-8111-111111111111';
const playerId = '22222222-2222-4222-8222-222222222222';
const itemId = '33333333-3333-4333-8333-333333333333';
const operationId = '44444444-4444-4444-8444-444444444444';
const details = { requestId, playerId, itemId, quantity: 3,
  reason: 'Entrega realizada após atendimento humano.' };

describe('manual item delivery without payment', () => {
  it('reads exclusively active published inventory item information', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ items: [{ itemId, slug: 'great-ball', displayName: 'Great Ball' }] }), { status: 200 }));
    expect(await readDeliveryInventoryCatalog(fetcher)).toEqual([
      { itemId, slug: 'great-ball', displayName: 'Great Ball' },
    ]);
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/hub/admin/premium/delivery/items');
    expect(fetcher.mock.calls[0]?.[1]?.credentials).toBe('include');
  });

  it('sends precisely player/item/amount/reason and stable UUID, never payment data', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ applied: true, replayed: false, operationId, ...details }), { status: 201 }));
    expect(await deliverPublishedInventoryItem(details, fetcher)).toEqual({
      kind: 'APPLIED', replayed: false, operationId,
    });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('/api/hub/admin/premium/delivery/items');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual(details);
    expect(JSON.stringify(init?.body)).not.toMatch(/payment|paid|amountCents|orderId/);
  });

  it('never reports an unauthorized or failed attempt as an applied delivery', async () => {
    for (const [httpStatus, code] of [
      [401, 'UNAUTHORIZED'], [403, 'FORBIDDEN'], [404, 'UNAVAILABLE'],
      [503, 'UNAVAILABLE'], [409, 'REJECTED'],
    ] as const) {
      const fetcher = vi.fn(async () => new Response(null, { status: httpStatus }));
      expect(await deliverPublishedInventoryItem(details, fetcher)).toEqual({ kind: 'ERROR', code });
    }
  });

  it('rejects invalid grants without contacting an API', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    await expect(deliverPublishedInventoryItem({ ...details, quantity: 0 }, fetcher)).rejects.toThrow();
    await expect(deliverPublishedInventoryItem({ ...details, playerId: 'fake' }, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
