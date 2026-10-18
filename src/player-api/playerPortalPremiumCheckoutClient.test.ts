import { describe, expect, it, vi } from 'vitest';
import { checkoutIntentId, completeCheckoutIntent, createPending2XpOrder } from './playerPortalPremiumCheckoutClient';

const requestId = '99999999-9999-4999-8999-999999999999';
const orderId = '88888888-8888-4888-8888-888888888888';
const playerId = '77777777-7777-4777-8777-777777777777';

describe('manual Premium order creation', () => {
  it('keeps one idempotency key for repeated submissions of the same cart', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    expect(checkoutIntentId(2, storage, () => requestId)).toBe(requestId);
    expect(checkoutIntentId(2, storage, () => { throw new Error('should not regenerate'); })).toBe(requestId);
    const alternate = '66666666-6666-4666-8666-666666666666';
    expect(checkoutIntentId(3, storage, () => alternate)).toBe(alternate);

    // Never release a newer checkout when an older response arrives late.
    completeCheckoutIntent(requestId, storage);
    expect(checkoutIntentId(3, storage, () => { throw new Error('new intent was erased'); })).toBe(alternate);

    // After an acknowledged order, allow a genuinely new 2XP purchase.
    completeCheckoutIntent(alternate, storage);
    const newOrderId = '55555555-5555-4555-8555-555555555555';
    expect(checkoutIntentId(3, storage, () => newOrderId)).toBe(newOrderId);
    expect(checkoutIntentId(3, storage, () => { throw new Error('retry should reuse request id'); })).toBe(newOrderId);
  });

  it('sends only SKU, quantity and idempotency key, never player ID or price', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(
      JSON.stringify({
        order: { id: orderId, humanId: 'PB-00000001', playerId, status: 'PENDING', totalCents: 8000, currency: 'BRL' },
        replayed: false,
        paymentStatus: 'PENDING',
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    ));
    const result = await createPending2XpOrder(2, requestId, fetcher);
    expect(result).toMatchObject({ status: 'created', order: { humanId: 'PB-00000001', totalCents: 8000 } });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('/api/hub/player/premium/orders');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ requestId, items: [{ sku: '2XP', quantity: 2 }] });
    expect(init?.credentials).toBe('include');
  });

  it('reports unauthenticated and unavailable backend instead of fabricating an order', async () => {
    for (const status of [401, 404, 503]) {
      const fetcher = vi.fn(async () => new Response(null, { status }));
      const result = await createPending2XpOrder(1, requestId, fetcher);
      expect(result.status).toBe(status === 401 ? 'unauthenticated' : 'unavailable');
    }
  });

  it('rejects invalid quantities and response data', async () => {
    const fn = vi.fn(async () => new Response(JSON.stringify({ order: { status: 'PAID' } }), { status: 201 }));
    await expect(createPending2XpOrder(53, requestId, fn)).rejects.toThrow();
    await expect(createPending2XpOrder(1, requestId, fn)).rejects.toThrow();
  });
});
