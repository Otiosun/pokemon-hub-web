import { describe, expect, it, vi } from 'vitest';
import { getPlayerPortalPokemon, type PlayerPortalPokemon } from './playerPortalClient';

const pokemon: PlayerPortalPokemon = {
  pokemonInstanceId: '11111111-1111-4111-8111-111111111111',
  formId: '22222222-2222-4222-8222-222222222222',
  displayName: 'Charmander',
  nationalDex: 4,
  typeNames: ['Fire'],
  nickname: 'Brasa',
  level: 12,
  xp: '120',
  xpToNextLevel: 469,
  currentHp: 31,
  maxHp: 31,
  natureDisplayName: 'Adamant',
  abilityDisplayName: 'Blaze',
  ivs: { hp: 31, attack: 30, defense: 29, spAttack: 12, spDefense: 18, speed: 27 },
  gender: 'M',
  shiny: false,
  placementKind: 'TEAM',
  boxNo: null,
  slotNo: 1,
  conditions: [],
  moves: [
    {
      slotNo: 1,
      moveId: '99999999-9999-4999-8999-999999999999',
      displayName: 'Scratch',
      typeName: 'Normal',
      category: 'PHYSICAL',
      power: 40,
      accuracy: 100,
      ppCurrent: 35,
      maxPp: 35,
    },
  ],
};

describe('getPlayerPortalPokemon', () => {
  it('reads owned Pokemon through the same-origin BFF with the signed session cookie', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ pokemon: [pokemon] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(getPlayerPortalPokemon(fetcher)).resolves.toEqual({
      status: 'authenticated',
      pokemon: [pokemon],
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/player/pokemon', {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('returns unauthenticated for a missing or expired session', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }));

    await expect(getPlayerPortalPokemon(fetcher)).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('rejects malformed ownership and placement data instead of trusting arbitrary JSON', async () => {
    const malformed = { ...pokemon, placementKind: 'LOCAL_PREVIEW', boxNo: 99 };
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ pokemon: [malformed] }), { status: 200 }),
    );

    await expect(getPlayerPortalPokemon(fetcher)).rejects.toThrow('Invalid player portal response');
  });

  it('accepts unresolved catalog presentation only when all presentation fields are unresolved', async () => {
    const unresolved = {
      ...pokemon,
      displayName: null,
      nationalDex: null,
      typeNames: [],
      nickname: null,
      gender: null,
      placementKind: 'BOX' as const,
      boxNo: 2,
      slotNo: 7,
    };
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ pokemon: [unresolved] }), {
          status: 200,
        }),
    );

    await expect(getPlayerPortalPokemon(fetcher)).resolves.toEqual({
      status: 'authenticated',
      pokemon: [unresolved],
    });
  });
});
