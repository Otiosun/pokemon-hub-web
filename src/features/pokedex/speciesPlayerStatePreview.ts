import { OWNED_POKEMON_PREVIEW } from '../collection/ownedPokemonPreview';

export type SpeciesDiscoveryState = 'unknown' | 'seen' | 'caught';

export type SpeciesPlayerState = {
  discovery: SpeciesDiscoveryState;
  researchLevel: 0 | 1 | 2 | 3 | 4 | 5;
  ownedCount: number;
  shinySeen: boolean;
  shinyOwned: boolean;
};

const SEEN_NOT_CAUGHT = new Set([
  2, 3, 5, 6, 8, 9, 11, 12, 16, 18, 19, 20, 22, 24, 26, 59, 63, 94, 129, 134, 149,
  245, 249, 384,
]);

const RESEARCH_OVERRIDES = new Map<number, SpeciesPlayerState['researchLevel']>([
  [1, 2],
  [4, 4],
  [7, 3],
  [10, 3],
  [25, 4],
  [92, 2],
  [131, 3],
  [133, 5],
  [148, 3],
  [197, 5],
  [245, 1],
  [249, 1],
  [384, 1],
]);

export function getSpeciesPlayerStatePreview(dex: number): SpeciesPlayerState {
  const owned = OWNED_POKEMON_PREVIEW.filter((pokemon) => pokemon.dex === dex);
  const ownedCount = owned.length;
  if (ownedCount > 0) {
    const shinyOwned = owned.some((pokemon) => pokemon.shiny);
    return {
      discovery: 'caught',
      researchLevel: RESEARCH_OVERRIDES.get(dex) ?? 2,
      ownedCount,
      shinySeen: shinyOwned,
      shinyOwned,
    };
  }

  if (SEEN_NOT_CAUGHT.has(dex)) {
    return {
      discovery: 'seen',
      researchLevel: RESEARCH_OVERRIDES.get(dex) ?? 1,
      ownedCount: 0,
      shinySeen: false,
      shinyOwned: false,
    };
  }

  return {
    discovery: 'unknown',
    researchLevel: 0,
    ownedCount: 0,
    shinySeen: false,
    shinyOwned: false,
  };
}
