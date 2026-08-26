import { describe, expect, it } from 'vitest';
import { OWNED_POKEMON_PREVIEW } from './ownedPokemonPreview';
import { applyCollectionFilters, DEFAULT_COLLECTION_FILTERS } from './collectionFilters';

describe('collection filters', () => {
  it('combines type, level, presence, shiny and sex filters', () => {
    const result = applyCollectionFilters(OWNED_POKEMON_PREVIEW, {
      ...DEFAULT_COLLECTION_FILTERS,
      type: 'Sombrio',
      level: '21-30',
      presence: 'storage',
      shiny: 'shiny',
      sex: 'M',
    });

    expect(result.map((pokemon) => pokemon.instanceId)).toEqual(['pkm-umbreon-c1']);
  });

  it('filters owned instances by sex from the base instance contract', () => {
    const females = applyCollectionFilters(OWNED_POKEMON_PREVIEW, {
      ...DEFAULT_COLLECTION_FILTERS,
      sex: 'F',
    });

    expect(females.map((pokemon) => pokemon.instanceId)).toEqual([
      'pkm-squirtle-a1',
      'pkm-caterpie-b1',
      'pkm-lapras-c1',
      'pkm-eevee-a1',
      'pkm-dragonair-a1',
    ]);
    expect(females.every((pokemon) => pokemon.sex === 'F')).toBe(true);
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
