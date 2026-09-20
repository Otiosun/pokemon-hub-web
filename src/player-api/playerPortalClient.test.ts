import { describe, expect, it, vi } from 'vitest';
import {
  exchangePlayerPortalTicket,
  getPlayerPortalBattle,
  getPlayerPortalInventory,
  getPlayerPortalLocation,
  getPlayerPortalSelf,
  type PlayerPortalProfile,
} from './playerPortalClient';
import { movePlayerPortalPokemon } from './playerPortalRosterClient';

const ticket = 'A'.repeat(43);
const sessionExpiresAt = '2026-09-10T00:00:00.000Z';
const profile: PlayerPortalProfile = {
  playerId: '11111111-1111-4111-8111-111111111111',
  playerStatus: 'ACTIVE',
  trainerName: 'Natan',
  originRegionId: '22222222-2222-4222-8222-222222222222',
  originRegionName: 'Kanto',
  locale: 'pt-BR',
  trainerLevel: 7,
  progressionPoints: '1234',
  onboardingState: 'COMPLETE',
  contentReleaseId: '33333333-3333-4333-8333-333333333333',
  rulesetId: '44444444-4444-4444-8444-444444444444',
  starterPokemonInstanceId: '55555555-5555-4555-8555-555555555555',
  team: [
    {
      pokemonInstanceId: '66666666-6666-4666-8666-666666666666',
      formId: '77777777-7777-4777-8777-777777777777',
      displayName: 'Charmander',
      nationalDex: 4,
      typeNames: ['Fire'],
      level: 12,
      currentHp: 31,
      shiny: true,
      slotNo: 1,
    },
  ],
};

describe('getPlayerPortalSelf', () => {
  it('reads the current player through the same-origin BFF with credentials included', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ profile }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    const result = await getPlayerPortalSelf(fetcher);

    expect(fetcher).toHaveBeenCalledWith('/api/hub/player/self', {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    expect(result).toEqual({ status: 'authenticated', profile });
  });

  it(
    'returns an explicit unauthenticated state for 401 without fabricating profile data',
    async () => {
      const fetcher = vi.fn(
        async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }),
      );

      await expect(getPlayerPortalSelf(fetcher)).resolves.toEqual({
        status: 'unauthenticated',
      });
    },
  );

  it('rejects malformed successful payloads instead of trusting arbitrary JSON', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ profile: { trainerName: 'Whatever' } }), { status: 200 }),
    );

    await expect(getPlayerPortalSelf(fetcher)).rejects.toThrow('Invalid player portal response');
  });

  it(
    'rejects malformed catalog presentation instead of accepting untrusted display metadata',
    async () => {
      const malformedProfile = { ...profile, originRegionName: 42 };
      const fetcher = vi.fn(
        async () => new Response(JSON.stringify({ profile: malformedProfile }), { status: 200 }),
      );

      await expect(getPlayerPortalSelf(fetcher)).rejects.toThrow(
        'Invalid player portal response',
      );
    },
  );

  it('rejects non-authentication HTTP failures as API errors', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"INTERNAL_ERROR"}', { status: 503 }));

    await expect(getPlayerPortalSelf(fetcher)).rejects.toThrow(
      'Player portal request failed (503)',
    );
  });
});

describe('getPlayerPortalBattle', () => {
  it('reads the active battle as read-only player state', async () => {
    const battle = {
      battleType: 'WILD',
      status: 'ACTIVE',
      turnNumber: 3,
      playerSideNo: 1,
      combatants: [
        {
          sideNo: 1,
          playerSide: true,
          active: true,
          displayName: 'Charmander',
          level: 12,
          currentHp: 20,
          maxHp: 31,
          conditions: [],
          moves: [
            {
              slotNo: 1,
              displayName: 'Scratch',
              ppCurrent: 34,
              maxPp: 35,
            },
          ],
        },
        {
          sideNo: 2,
          playerSide: false,
          active: true,
          displayName: 'Pidgey',
          level: 7,
          currentHp: 14,
          maxHp: 18,
          conditions: ['PARALYSIS'],
          moves: [],
        },
      ],
    };
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ battle }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(getPlayerPortalBattle(fetcher)).resolves.toEqual({
      status: 'authenticated',
      battle,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/player/battle', {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('rejects battle payloads whose player-side marker disagrees with playerSideNo', async () => {
    const malformed = {
      battleType: 'WILD',
      status: 'ACTIVE',
      turnNumber: 1,
      playerSideNo: 1,
      combatants: [
        {
          sideNo: 1,
          playerSide: false,
          active: true,
          displayName: 'Charmander',
          level: 12,
          currentHp: 20,
          maxHp: 31,
          conditions: [],
          moves: [],
        },
        {
          sideNo: 2,
          playerSide: false,
          active: true,
          displayName: 'Pidgey',
          level: 7,
          currentHp: 14,
          maxHp: 18,
          conditions: [],
          moves: [],
        },
      ],
    };
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ battle: malformed }), { status: 200 }),
    );

    await expect(getPlayerPortalBattle(fetcher)).rejects.toThrow('Invalid player portal response');
  });

  it('accepts no active battle without fabricating one', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ battle: null }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(getPlayerPortalBattle(fetcher)).resolves.toEqual({
      status: 'authenticated',
      battle: null,
    });
  });
});

describe('getPlayerPortalInventory', () => {
  it('reads authoritative item quantities through the same-origin BFF', async () => {
    const inventory = [
      {
        itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        itemSlug: 'poke-ball',
        displayName: 'Poké Ball',
        quantity: '12',
      },
    ];
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ inventory }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(getPlayerPortalInventory(fetcher)).resolves.toEqual({
      status: 'authenticated',
      inventory,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/player/inventory', {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('rejects malformed inventory quantities', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            inventory: [
              {
                itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                itemSlug: 'poke-ball',
                displayName: 'Poké Ball',
                quantity: '-1',
              },
            ],
          }),
          { status: 200 },
        ),
    );

    await expect(getPlayerPortalInventory(fetcher)).rejects.toThrow(
      'Invalid player portal response',
    );
  });
});

describe('getPlayerPortalLocation', () => {
  it('reads a minimal read-only location through the same-origin BFF', async () => {
    const location = {
      areaId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      areaSlug: 'vila-dos-arrozais',
      areaDisplayName: 'Vila dos Arrozais',
      regionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      regionSlug: 'zhoulia',
      regionDisplayName: 'Zhoulia',
      safePoint: true,
      enteredAt: '2026-09-10T00:00:00.000Z',
    };
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ location }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(getPlayerPortalLocation(fetcher)).resolves.toEqual({
      status: 'authenticated',
      location,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/player/location', {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('keeps a missing world location distinct from session expiry', async () => {
    const missing = vi.fn(async () => new Response('{"error":"NOT_FOUND"}', { status: 404 }));
    const expired = vi.fn(async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }));

    await expect(getPlayerPortalLocation(missing)).resolves.toEqual({ status: 'unavailable' });
    await expect(getPlayerPortalLocation(expired)).resolves.toEqual({ status: 'unauthenticated' });
  });
});

describe('movePlayerPortalPokemon', () => {
  it(
    'persists a roster placement through the same-origin BFF and returns the authoritative collection',
    async () => {
      const fetcher = vi.fn(
        async () =>
          new Response(JSON.stringify({ pokemon: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      );
      const input = {
        pokemonInstanceId: '66666666-6666-4666-8666-666666666666',
        target: { placementKind: 'TEAM' as const, boxNo: null, slotNo: 2 },
      };

      await expect(movePlayerPortalPokemon(input, fetcher)).resolves.toEqual({
        status: 'authenticated',
        pokemon: [],
      });
      expect(fetcher).toHaveBeenCalledWith('/api/hub/player/roster', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
      });
    },
  );

  it('rejects a Box slot outside the canonical 30-slot capacity before the request', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 500 }));
    const input = {
      pokemonInstanceId: '66666666-6666-4666-8666-666666666666',
      target: { placementKind: 'BOX' as const, boxNo: 1, slotNo: 31 },
    };

    await expect(movePlayerPortalPokemon(input, fetcher)).rejects.toThrow(
      'Invalid player portal roster request',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not pretend a roster move succeeded after session expiry', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }));
    const input = {
      pokemonInstanceId: '66666666-6666-4666-8666-666666666666',
      target: { placementKind: 'BOX' as const, boxNo: 1, slotNo: 3 },
    };

    await expect(movePlayerPortalPokemon(input, fetcher)).resolves.toEqual({
      status: 'unauthenticated',
    });
  });
});

describe('exchangePlayerPortalTicket', () => {
  it('exchanges a valid one-shot ticket through the same-origin BFF', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ profile, sessionExpiresAt }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(exchangePlayerPortalTicket(ticket, fetcher)).resolves.toEqual({
      status: 'authenticated',
      profile,
      sessionExpiresAt,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/auth/exchange', {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ticket }),
    });
  });

  it('rejects malformed tickets before contacting the BFF', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 500 }));

    await expect(exchangePlayerPortalTicket('not-a-ticket', fetcher)).resolves.toEqual({
      status: 'invalid_ticket',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('maps expired or already-used tickets to an explicit invalid state', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }));

    await expect(exchangePlayerPortalTicket(ticket, fetcher)).resolves.toEqual({
      status: 'invalid_ticket',
    });
  });

  it('keeps ineligible players distinct from invalid tickets', async () => {
    const fetcher = vi.fn(
      async () => new Response('{"error":"PLAYER_INELIGIBLE"}', { status: 403 }),
    );

    await expect(exchangePlayerPortalTicket(ticket, fetcher)).resolves.toEqual({
      status: 'ineligible',
    });
  });

  it('rejects malformed successful exchange payloads', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ profile, sessionExpiresAt: 'not-a-date' }), { status: 200 }),
    );

    await expect(exchangePlayerPortalTicket(ticket, fetcher)).rejects.toThrow(
      'Invalid player portal response',
    );
  });

  it('rejects unexpected exchange failures as login errors', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"INTERNAL_ERROR"}', { status: 503 }));

    await expect(exchangePlayerPortalTicket(ticket, fetcher)).rejects.toThrow(
      'Player portal login failed (503)',
    );
  });
});
