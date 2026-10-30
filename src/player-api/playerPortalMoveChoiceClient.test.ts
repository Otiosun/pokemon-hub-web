import { describe, expect, it, vi } from 'vitest';
import {
  getPlayerPortalMoveChoices,
  resolvePlayerPortalMoveChoice,
} from './playerPortalMoveChoiceClient';

const choice = {
  choiceId: '11111111-1111-4111-8111-111111111111',
  pokemonInstanceId: '22222222-2222-4222-8222-222222222222',
  pokemonDisplayName: 'Charmander',
  learnLevel: 16,
  moveId: '33333333-3333-4333-8333-333333333333',
  moveDisplayName: 'Dragon Rage',
  currentMoves: [
    {
      slotNo: 1,
      moveId: '44444444-4444-4444-8444-444444444444',
      displayName: 'Scratch',
    },
  ],
};

describe('player portal move choices', () => {
  it('reads pending move choices through the same-origin BFF', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ blockedByBattle: false, choices: [choice] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(getPlayerPortalMoveChoices(fetcher)).resolves.toEqual({
      status: 'authenticated',
      blockedByBattle: false,
      choices: [choice],
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/player/move-choices', {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('resolves a replacement and receives the refreshed pending list', async () => {
    const responseBody = {
      result: {
        choiceId: choice.choiceId,
        pokemonInstanceId: choice.pokemonInstanceId,
        moveId: choice.moveId,
        status: 'RESOLVED',
        replacedSlotNo: 1,
        replayed: false,
      },
      blockedByBattle: false,
      choices: [],
    };
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(
      resolvePlayerPortalMoveChoice({ choiceId: choice.choiceId, replaceSlotNo: 1 }, fetcher),
    ).resolves.toEqual({ status: 'authenticated', ...responseBody });
  });

  it('maps active-battle conflicts without pretending the move changed', async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ error: 'FLOW_BLOCKED' }), { status: 409 }),
    );

    await expect(
      resolvePlayerPortalMoveChoice({ choiceId: choice.choiceId, replaceSlotNo: 1 }, fetcher),
    ).resolves.toEqual({ status: 'blocked' });
  });

  it('treats a missing choice as stale instead of pretending it succeeded', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 404 }));

    await expect(
      resolvePlayerPortalMoveChoice({ choiceId: choice.choiceId, replaceSlotNo: null }, fetcher),
    ).resolves.toEqual({ status: 'stale' });
  });

  it('rejects malformed pending choice payloads', async () => {
    const malformed = { ...choice, currentMoves: [{ ...choice.currentMoves[0], slotNo: 5 }] };
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ blockedByBattle: false, choices: [malformed] }), {
          status: 200,
        }),
    );

    await expect(getPlayerPortalMoveChoices(fetcher)).rejects.toThrow(
      'Invalid player portal move choices response',
    );
  });
});
