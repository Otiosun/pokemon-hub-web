import type { OwnedPokemonPreview, OwnedPokemonSex } from './ownedPokemonPreview';

export type CollectionLevelFilter = 'all' | '1-10' | '11-20' | '21-30' | '31+';
export type CollectionPresenceFilter = 'all' | 'team' | 'storage';
export type CollectionShinyFilter = 'all' | 'shiny' | 'regular';
export type CollectionSexFilter = 'all' | OwnedPokemonSex;
export type CollectionSort = 'dex' | 'name' | 'level-desc' | 'level-asc';

export type CollectionFilterState = {
  type: string | null;
  level: CollectionLevelFilter;
  presence: CollectionPresenceFilter;
  shiny: CollectionShinyFilter;
  sex: CollectionSexFilter;
  sort: CollectionSort;
};

export const DEFAULT_COLLECTION_FILTERS: CollectionFilterState = {
  type: null,
  level: 'all',
  presence: 'all',
  shiny: 'all',
  sex: 'all',
  sort: 'dex',
};

function matchesLevel(level: number, filter: CollectionLevelFilter) {
  if (filter === 'all') return true;
  if (filter === '1-10') return level <= 10;
  if (filter === '11-20') return level >= 11 && level <= 20;
  if (filter === '21-30') return level >= 21 && level <= 30;
  return level >= 31;
}

export function applyCollectionFilters(
  pokemon: readonly OwnedPokemonPreview[],
  filters: CollectionFilterState,
) {
  const filtered = pokemon.filter((item) => {
    if (filters.type && !item.types.includes(filters.type)) return false;
    if (!matchesLevel(item.level, filters.level)) return false;
    if (filters.presence === 'team' && item.teamSlot === null) return false;
    if (filters.presence === 'storage' && item.teamSlot !== null) return false;
    if (filters.shiny === 'shiny' && !item.shiny) return false;
    if (filters.shiny === 'regular' && item.shiny) return false;
    if (filters.sex !== 'all' && item.sex !== filters.sex) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === 'name') {
      return a.nickname.localeCompare(b.nickname, 'pt-BR', { sensitivity: 'base' });
    }
    if (filters.sort === 'level-desc') return b.level - a.level || a.dex - b.dex;
    if (filters.sort === 'level-asc') return a.level - b.level || a.dex - b.dex;
    return a.dex - b.dex || a.nickname.localeCompare(b.nickname, 'pt-BR', { sensitivity: 'base' });
  });
}

export function countCollectionFilters(filters: CollectionFilterState) {
  let count = 0;
  if (filters.type) count += 1;
  if (filters.level !== 'all') count += 1;
  if (filters.presence !== 'all') count += 1;
  if (filters.shiny !== 'all') count += 1;
  if (filters.sex !== 'all') count += 1;
  return count;
}
