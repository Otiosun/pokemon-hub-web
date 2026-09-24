import { describe, expect, it, vi } from 'vitest';
import { getAdminRewardCatalog } from './playerPortalAdminRewardCatalogClient';

describe('admin reward catalog client', () => {
  it('parses the capability-approved reward catalog', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          items: [
            {
              itemId: '11111111-1111-4111-8111-111111111111',
              slug: 'great-ball',
              displayName: 'Great Ball',
              itemKind: 'BALL',
            },
          ],
          currencies: [
            {
              currencyId: '22222222-2222-4222-8222-222222222222',
              slug: 'poke-dollar',
              displayName: 'Poké Dollar',
              allowsNegative: false,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(getAdminRewardCatalog(fetcher as typeof fetch)).resolves.toMatchObject({
      status: 'ok',
      items: [{ slug: 'great-ball' }],
      currencies: [{ slug: 'poke-dollar' }],
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/admin/reward-catalog', {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('preserves authorization boundaries and rejects malformed catalog data', async () => {
    const denied = vi.fn(async () => new Response(null, { status: 403 }));
    await expect(getAdminRewardCatalog(denied as typeof fetch)).resolves.toEqual({
      status: 'forbidden',
    });

    const malformed = vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ itemId: 'bad' }], currencies: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(getAdminRewardCatalog(malformed as typeof fetch)).rejects.toThrow(
      'Invalid admin reward catalog response',
    );
  });
});
