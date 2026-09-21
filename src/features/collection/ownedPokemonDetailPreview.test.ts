import { describe, expect, it } from 'vitest';
import { DEFAULT_COLLECTION_FILTERS } from './collectionFilters';
import { rememberCollectionFilters } from './collectionSession';
import { getOwnedPokemonNeighbours } from './ownedPokemonDetailPreview';

describe('owned Pokemon contextual neighbours', () => {
  it('uses the canonical active team order', () => {
    const neighbours = getOwnedPokemonNeighbours('pkm-charmander-a1', '/team');

    expect(neighbours.previous).toBeNull();
    expect(neighbours.next?.instanceId).toBe('pkm-squirtle-a1');
  });

  it('keeps the Journey lead context intentionally single-item', () => {
    const neighbours = getOwnedPokemonNeighbours(
      'pkm-charmander-a1',
      '/jornada?pokemonContext=lead',
    );

    expect(neighbours).toEqual({ previous: null, next: null });
  });

  it('does not leak Box siblings through a forged Journey lead context', () => {
    const neighbours = getOwnedPokemonNeighbours(
      'pkm-squirtle-a1',
      '/jornada?pokemonContext=lead',
    );

    expect(neighbours).toEqual({ previous: null, next: null });
  });

  it('does not invent sibling arrows when the species context has one owned instance', () => {
    rememberCollectionFilters('all', '', { ...DEFAULT_COLLECTION_FILTERS });
    const neighbours = getOwnedPokemonNeighbours('pkm-charmander-a1', '/pokemon?species=4');

    expect(neighbours).toEqual({ previous: null, next: null });
  });


  it('does not fall back to the whole Box when the current Pokemon is outside the context', () => {
    rememberCollectionFilters('all', '', { ...DEFAULT_COLLECTION_FILTERS });
    const neighbours = getOwnedPokemonNeighbours('pkm-squirtle-a1', '/pokemon?species=4');

    expect(neighbours).toEqual({ previous: null, next: null });
  });

  it('uses the current collection filters for sibling navigation', () => {
    rememberCollectionFilters('all', '', {
      ...DEFAULT_COLLECTION_FILTERS,
      type: 'Fogo',
    });
    const neighbours = getOwnedPokemonNeighbours('pkm-charmander-a1', '/pokemon');

    expect(neighbours.previous).toBeNull();
    expect(neighbours.next?.instanceId).toBe('pkm-growlithe-c1');

    rememberCollectionFilters('all', '', { ...DEFAULT_COLLECTION_FILTERS });
  });
});
