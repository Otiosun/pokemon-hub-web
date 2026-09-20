import type {
  PlayerPortalPokemon,
  PlayerPortalPokemonIvs,
  PlayerPortalPokemonMove,
} from '../../player-api/playerPortalClient';

export type OwnedPokemonSex = 'M' | 'F' | '—';

export type OwnedPokemonView = {
  instanceId: string;
  dex: number | null;
  species: string;
  nickname: string;
  level: number;
  xp: string;
  xpToNextLevel: number;
  currentHp: number;
  maxHp: number | null;
  conditions: string[];
  fainted: boolean;
  nature: string | null;
  ability: string | null;
  ivs: PlayerPortalPokemonIvs;
  moves: PlayerPortalPokemonMove[];
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
    const species = catalogResolved && item.displayName !== null ? item.displayName : UNAVAILABLE;
    const nickname =
      catalogResolved && item.displayName !== null
        ? item.nickname?.trim() || item.displayName
        : UNAVAILABLE;

    return {
      instanceId: item.pokemonInstanceId,
      dex: catalogResolved ? item.nationalDex : null,
      species,
      nickname,
      level: item.level,
      xp: item.xp,
      xpToNextLevel: item.xpToNextLevel,
      currentHp: item.currentHp,
      maxHp: item.maxHp,
      conditions: [...item.conditions],
      fainted: item.currentHp === 0,
      nature: item.natureDisplayName,
      ability: item.abilityDisplayName,
      ivs: { ...item.ivs },
      moves: item.moves.map((move) => ({ ...move })),
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
