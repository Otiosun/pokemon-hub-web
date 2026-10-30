import { describe, expect, it, vi } from 'vitest';
import { movePlayerPortalPokemon } from './playerPortalRosterClient';

const pokemonInstanceId = '11111111-1111-4111-8111-111111111111';
const input = {
  pokemonInstanceId,
  target: { placementKind: 'TEAM' as const, boxNo: null, slotNo: 2 },
};

describe('Hub Team/Box mutation responses', () => {
  it('distinguishes active-battle blocks from stale and invalid moves', async () => {
    for (const [status, error, expected] of [
      [409, 'FLOW_BLOCKED', 'blocked'],
      [409, 'ACTION_INVALID', 'rejected'],
      [404, 'NOT_FOUND', 'stale'],
    ] as const) {
      const fetcher = vi.fn(async () => Response.json({ error }, { status }));
      expect(await movePlayerPortalPokemon(input, fetcher, false))
        .toEqual({ status: expected });
    }
  });

  it('does not claim a successful move on connection failure', async () => {
    const fetcher = vi.fn(async () => { throw new Error('gateway timeout'); });
    await expect(movePlayerPortalPokemon(input, fetcher, false))
      .rejects.toThrow('gateway timeout');
  });

  it('blocks invalid Box slot 31 before making a network request', async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    await expect(movePlayerPortalPokemon({
      pokemonInstanceId,
      target: { placementKind: 'BOX', boxNo: 1, slotNo: 31 },
    }, fetcher, false)).rejects.toThrow('Invalid player portal roster request');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
