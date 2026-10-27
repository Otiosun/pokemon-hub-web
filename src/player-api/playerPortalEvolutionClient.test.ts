import { describe, expect, it, vi } from 'vitest';
import { requestPlayerEvolution } from './playerPortalEvolutionClient';

const pokemonInstanceId = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const formId = '33333333-3333-4333-8333-333333333333';
const input = { pokemonInstanceId, requestId, trigger: { kind: 'LEVEL' as const } };

describe('player evolution client', () => {
  it('preserves the same request ID and same payload across repeated calls', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 503 }));
    expect(await requestPlayerEvolution(input, fetcher, false))
      .toEqual({ status: 'unavailable' });
    expect(await requestPlayerEvolution(input, fetcher, false))
      .toEqual({ status: 'unavailable' });
    const submitted = fetcher.mock.calls;
    expect(submitted).toHaveLength(2);
    expect(JSON.parse(submitted[0]![1]!.body as string)).toEqual(input);
    expect(submitted[1]![1]!.body).toBe(submitted[0]![1]!.body);
  });

  it('does not invent successes on blocked, missing or forbidden operations', async () => {
    const responses = [
      [401, {}, 'unauthenticated'],
      [404, {}, 'not-found'],
      [409, { error: 'FLOW_BLOCKED' }, 'blocked'],
      [409, { error: 'ACTION_INVALID' }, 'rejected'],
    ] as const;
    for (const [status, body, outcome] of responses) {
      const fetcher = vi.fn(async () => Response.json(body, { status }));
      const result = await requestPlayerEvolution(input, fetcher, false);
      expect(result.status).toBe(outcome);
    }
  });

  it('validates a successful evolution and authoritative refreshed roster', async () => {
    const pokemon = {
      pokemonInstanceId, formId, formSlug: 'charmeleon', speciesSlug: 'charmeleon',
      displayName: 'Charmeleon', nationalDex: 5, typeNames: ['FIRE'], nickname: null,
      level: 16, xp: '100', xpToNextLevel: 200, currentHp: 36, maxHp: 45,
      natureDisplayName: null, abilityDisplayName: null,
      ivs: { hp: 12, attack: 10, defense: 15, spAttack: 14, spDefense: 13, speed: 20 },
      gender: 'M', shiny: false, placementKind: 'TEAM', boxNo: null,
      slotNo: 1, conditions: [], moves: [],
    };
    const fetcher = vi.fn(async () => Response.json({
      evolution: { toFormId: formId, replayed: false },
      pokemon: [pokemon],
    }));
    const result = await requestPlayerEvolution(input, fetcher, false);
    expect(result).toMatchObject({ status: 'applied', replayed: false, pokemon: [pokemon] });
  });

  it('submits a real inventory item UUID to the canonical evolution route without guessing the target form', async () => {
    const itemId = '44444444-4444-4444-8444-444444444444';
    const chosen = { ...input, trigger: { kind: 'ITEM' as const, itemId } };
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ error: 'ACTION_INVALID' }, { status: 409 }),
    );
    await expect(requestPlayerEvolution(chosen, fetcher, false)).resolves.toEqual({
      status: 'rejected',
      code: 'ACTION_INVALID',
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/player/pokemon/evolve', {
      method: 'POST',
      credentials: 'include',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(chosen),
    });
  });

  it('refuses unapproved triggers and never mutates showcase state', async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    await expect(requestPlayerEvolution({
      ...input, trigger: { kind: 'ITEM', itemId: 'invalid' },
    }, fetcher, false)).rejects.toThrow();
    expect(await requestPlayerEvolution(input, fetcher, true))
      .toEqual({ status: 'unavailable' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
