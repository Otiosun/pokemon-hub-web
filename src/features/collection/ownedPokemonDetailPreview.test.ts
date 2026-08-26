import { describe, expect, it } from 'vitest';
import { DEFAULT_COLLECTION_FILTERS } from './collectionFilters';
import { rememberCollectionFilters } from './collectionSession';
import { getOwnedPokemonNeighbours } from './ownedPokemonDetailPreview';

describe('owned Pokemon contextual neighbours', () => {
  it('uses the active team order when the Pokemon was opened from Team', () => {
    const neighbours = getOwnedPokemonNeighbours('pkm-charmander-a1', '/team');

    expect(neighbours.previous?.instanceId).toBe('pkm-dragonair-a1');
    expect(neighbours.next?.instanceId).toBe('pkm-squirtle-a1');
  });

  it('does not invent sibling arrows when the species context has one owned instance', () => {
    rememberCollectionFilters('all', '', { ...DEFAULT_COLLECTION_FILTERS });
    const neighbours = getOwnedPokemonNeighbours('pkm-charmander-a1', '/pokemon?species=4');

    expect(neighbours).toEqual({ previous: null, next: null });
  });

  it('uses the current collection mode and filters for sibling navigation', () => {
    rememberCollectionFilters('favorites', '', { ...DEFAULT_COLLECTION_FILTERS });
    const neighbours = getOwnedPokemonNeighbours('pkm-charmander-a1', '/pokemon');

    expect(neighbours.previous?.instanceId).toBe('pkm-umbreon-c1');
    expect(neighbours.next?.instanceId).toBe('pkm-pikachu-a1');

    rememberCollectionFilters('all', '', { ...DEFAULT_COLLECTION_FILTERS });
  });
});
