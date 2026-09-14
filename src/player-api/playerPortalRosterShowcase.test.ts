import { describe, expect, it, vi } from 'vitest';
import { movePlayerPortalPokemon } from './playerPortalRosterClient';

const VALID_MOVE = {
  pokemonInstanceId: '00000000-0000-4000-8000-000000001006',
  target: { placementKind: 'TEAM' as const, boxNo: null, slotNo: 1 },
};

describe('player portal roster showcase safety', () => {
  it('does not send a roster write while the advanced showcase is active', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));

    await expect(movePlayerPortalPokemon(VALID_MOVE, fetcher, true)).rejects.toThrow(
      'Advanced showcase roster writes are disabled',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
