import { describe, expect, it, vi } from 'vitest';
import { movePlayerPortalPokemon } from './playerPortalRosterClient';

const VALID_MOVE = {
  pokemonInstanceId: '00000000-0000-4000-8000-000000001006',
  target: { placementKind: 'TEAM' as const, boxNo: null, slotNo: 2 },
};

describe('player portal roster showcase sandbox', () => {
  it('reorganizes the local showcase without sending a backend write', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 500 }));

    const result = await movePlayerPortalPokemon(VALID_MOVE, fetcher, true);

    expect(result.status).toBe('authenticated');
    expect(fetcher).not.toHaveBeenCalled();
    if (result.status !== 'authenticated') return;
    const moved = result.pokemon.find((entry) => entry.pokemonInstanceId === VALID_MOVE.pokemonInstanceId);
    expect(moved?.placementKind).toBe('TEAM');
    expect(moved?.slotNo).toBe(2);
  });
});
