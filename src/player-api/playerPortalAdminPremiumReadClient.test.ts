import { describe, expect, it, vi } from 'vitest';
import { getAdminPremiumRead } from './playerPortalAdminPremiumReadClient';

const id = '11111111-1111-4111-8111-111111111111';

describe('Admin Premium protected read client', () => {
  it('passes only player id and resource to the allowlisted proxy', async () => {
    const mock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ orders: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const result = await getAdminPremiumRead(id, 'orders', mock);
    expect(result).toEqual({ status: 'ok', orders: [] });
    expect(mock).toHaveBeenCalledTimes(1);
    const [url, init] = mock.mock.calls[0]!;
    expect(url).toBe(`/api/hub/admin/premium?playerId=${id}&resource=orders`);
    expect(init).toMatchObject({ credentials: 'include', cache: 'no-store' });
  });

  it('does not turn a missing backend route into an empty real ledger', async () => {
    const mock = vi.fn(async () => new Response(null, { status: 404 }));
    expect(await getAdminPremiumRead(id, 'orders', mock)).toEqual({ status: 'unavailable' });
    expect(await getAdminPremiumRead(id, 'entitlements', mock)).toEqual({ status: 'unavailable' });
  });

  it('preserves forbidden state and rejects malformed payloads', async () => {
    const forbidden = vi.fn(async () => new Response(null, { status: 403 }));
    expect(await getAdminPremiumRead(id, 'orders', forbidden)).toEqual({ status: 'forbidden' });
    const malformed = vi.fn(
      async () =>
        new Response(JSON.stringify({ orders: [{ status: 'PAID' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    await expect(getAdminPremiumRead(id, 'orders', malformed)).rejects.toThrow('formato inválido');
  });

  it('rejects malformed player identifiers before sending requests', async () => {
    const mock = vi.fn(async () => new Response(null, { status: 200 }));
    await expect(getAdminPremiumRead('not-a-player', 'orders', mock)).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
  });
});
