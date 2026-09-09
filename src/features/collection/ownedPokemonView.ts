import type { PlayerPortalPokemon } from '../../player-api/playerPortalClient';

export type OwnedPokemonSex = 'M' | 'F' | '—';

export type OwnedPokemonView = {
  instanceId: string;
  dex: number | null;
  species: string;
  nickname: string;
  level: number;
  currentHp: number;
  types: string[];
  sex: OwnedPokemonSex;
  shiny: boolean;
  box: string;
  teamSlot: number | null;
  catalogResolved: boolean;
};

const UNAVAILABLE = 'REGISTRO INDISPONÍVEL';

export function createOwnedPokemonView(
  pokemon: readonly PlayerPortalPokemon[],
): OwnedPokemonView[] {
  return pokemon.map((item) => {
    const catalogResolved =
      item.displayName !== null && item.nationalDex !== null && item.typeNames.length > 0;
    const species = catalogResolved ? item.displayName : UNAVAILABLE;
    const nickname = catalogResolved ? item.nickname?.trim() || species : UNAVAILABLE;

    return {
      instanceId: item.pokemonInstanceId,
      dex: catalogResolved ? item.nationalDex : null,
      species,
      nickname,
      level: item.level,
      currentHp: item.currentHp,
      types: catalogResolved ? [...item.typeNames] : [],
      sex: item.gender === 'M' || item.gender === 'F' ? item.gender : '—',
      shiny: item.shiny,
      box: item.placementKind === 'TEAM' ? 'TIME' : `BOX ${item.boxNo ?? '—'}`,
      teamSlot: item.placementKind === 'TEAM' ? item.slotNo : null,
      catalogResolved,
    };
  });
}

export function findOwnedPokemonView(
  pokemon: readonly OwnedPokemonView[],
  instanceId: string,
): OwnedPokemonView | null {
  return pokemon.find((item) => item.instanceId === instanceId) ?? null;
}
