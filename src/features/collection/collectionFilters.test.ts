import { describe, expect, it } from 'vitest';
import { OWNED_POKEMON_PREVIEW } from './ownedPokemonPreview';
import { applyCollectionFilters, DEFAULT_COLLECTION_FILTERS } from './collectionFilters';

describe('collection filters', () => {
  it('combines type, level, presence and shiny filters', () => {
    const result = applyCollectionFilters(OWNED_POKEMON_PREVIEW, {
      ...DEFAULT_COLLECTION_FILTERS,
      type: 'Sombrio',
      level: '21-30',
      presence: 'storage',
      shiny: 'shiny',
    });

    expect(result.map((pokemon) => pokemon.instanceId)).toEqual(['pkm-umbreon-c1']);
  });

  it('sorts by level without mutating the source collection', () => {
    const before = OWNED_POKEMON_PREVIEW.map((pokemon) => pokemon.instanceId);
    const result = applyCollectionFilters(OWNED_POKEMON_PREVIEW, {
      ...DEFAULT_COLLECTION_FILTERS,
      sort: 'level-desc',
    });

    expect(result[0]?.instanceId).toBe('pkm-dragonair-a1');
    expect(OWNED_POKEMON_PREVIEW.map((pokemon) => pokemon.instanceId)).toEqual(before);
  });

  it('distinguishes active team members from storage', () => {
    const team = applyCollectionFilters(OWNED_POKEMON_PREVIEW, {
      ...DEFAULT_COLLECTION_FILTERS,
      presence: 'team',
    });
    const storage = applyCollectionFilters(OWNED_POKEMON_PREVIEW, {
      ...DEFAULT_COLLECTION_FILTERS,
      presence: 'storage',
    });

    expect(team).toHaveLength(6);
    expect(team.every((pokemon) => pokemon.teamSlot !== null)).toBe(true);
    expect(storage.every((pokemon) => pokemon.teamSlot === null)).toBe(true);
  });
});
