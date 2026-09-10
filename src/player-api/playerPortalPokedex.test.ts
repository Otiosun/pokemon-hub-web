import { describe, expect, it, vi } from 'vitest';
import { getPlayerPortalPokedex, type PlayerPortalFetcher } from './playerPortalClient';

const validPokedex = [
  {
    nationalDex: 4,
    seenCount: '3',
    caughtCount: '1',
    firstSeenAt: '2026-09-01T10:00:00.000Z',
    lastSeenAt: '2026-09-08T12:30:00.000Z',
    firstCaughtAt: '2026-09-02T11:00:00.000Z',
    lastCaughtAt: '2026-09-02T11:00:00.000Z',
  },
];

describe('getPlayerPortalPokedex', () => {
  it('reads the authenticated player Pokedex through the same-origin BFF', async () => {
    const fetcher: PlayerPortalFetcher = vi.fn(async () =>
      new Response(JSON.stringify({ pokedex: validPokedex }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(getPlayerPortalPokedex(fetcher)).resolves.toEqual({
      status: 'authenticated',
      pokedex: validPokedex,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/player/pokedex', {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('returns unauthenticated on 401', async () => {
    const fetcher: PlayerPortalFetcher = vi.fn(async () => new Response(null, { status: 401 }));

    await expect(getPlayerPortalPokedex(fetcher)).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('fails closed on malformed or impossible progress', async () => {
    const malformed = [
      { ...validPokedex[0], caughtCount: '4' },
      { ...validPokedex[0], seenCount: '-1' },
      { ...validPokedex[0], nationalDex: 0 },
      { ...validPokedex[0], firstSeenAt: 'yesterday' },
    ];

    for (const entry of malformed) {
      const fetcher: PlayerPortalFetcher = vi.fn(async () =>
        new Response(JSON.stringify({ pokedex: [entry] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
      await expect(getPlayerPortalPokedex(fetcher)).rejects.toThrow('Invalid player portal response');
    }
  });
});
