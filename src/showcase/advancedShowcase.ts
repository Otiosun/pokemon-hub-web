import type { PlayerPortalSessionBootstrap } from '../player-api/playerPortalSession';
import type {
  PlayerPortalPokedexSpecies,
  PlayerPortalPokemon,
  PlayerPortalProfile,
} from '../player-api/playerPortalClient';

const SHOWCASE_QUERY_KEY = 'showcase';
const SHOWCASE_QUERY_VALUE = 'advanced';
const SHOWCASE_SESSION_KEY = 'pokemon-beyond:showcase';
const SHOWCASE_TIMESTAMP = '2026-09-01T12:00:00.000Z';

function demoUuid(seed: number) {
  return `00000000-0000-4000-8000-${String(seed).padStart(12, '0')}`;
}

type ShowcaseSpecies = {
  dex: number;
  name: string;
  types: string[];
  level: number;
  shiny?: boolean;
};

type AdvancedShowcaseJourney = {
  trainerId: string;
  publicVerificationId: string;
  currentLocation: string;
  ownedPokemonCount: number;
  registeredSpeciesCount: number;
  personal: {
    age: number;
    height: string;
    appearance: string;
    bio: string;
  };
  badges: Array<{
    key: string;
    name: string;
    earned: boolean;
  }>;
};

type AdvancedShowcaseResolvedState = {
  active: boolean;
  rememberedValue: string | null;
};

const SHOWCASE_SPECIES: readonly ShowcaseSpecies[] = [
  { dex: 6, name: 'Charizard', types: ['Fogo', 'Voador'], level: 78 },
  { dex: 9, name: 'Blastoise', types: ['Água'], level: 76 },
  { dex: 3, name: 'Venusaur', types: ['Planta', 'Veneno'], level: 77 },
  { dex: 248, name: 'Tyranitar', types: ['Pedra', 'Sombrio'], level: 81 },
  { dex: 376, name: 'Metagross', types: ['Aço', 'Psíquico'], level: 80 },
  { dex: 384, name: 'Rayquaza', types: ['Dragão', 'Voador'], level: 86, shiny: true },
  { dex: 25, name: 'Pikachu', types: ['Elétrico'], level: 54 },
  { dex: 59, name: 'Arcanine', types: ['Fogo'], level: 68 },
  { dex: 94, name: 'Gengar', types: ['Fantasma', 'Veneno'], level: 71, shiny: true },
  { dex: 131, name: 'Lapras', types: ['Água', 'Gelo'], level: 67 },
  { dex: 133, name: 'Eevee', types: ['Normal'], level: 49 },
  { dex: 149, name: 'Dragonite', types: ['Dragão', 'Voador'], level: 74 },
  { dex: 150, name: 'Mewtwo', types: ['Psíquico'], level: 82, shiny: true },
  { dex: 151, name: 'Mew', types: ['Psíquico'], level: 70 },
  { dex: 196, name: 'Espeon', types: ['Psíquico'], level: 64 },
  { dex: 197, name: 'Umbreon', types: ['Sombrio'], level: 65, shiny: true },
  { dex: 212, name: 'Scizor', types: ['Inseto', 'Aço'], level: 69 },
  { dex: 214, name: 'Heracross', types: ['Inseto', 'Lutador'], level: 66 },
  { dex: 229, name: 'Houndoom', types: ['Sombrio', 'Fogo'], level: 63 },
  { dex: 230, name: 'Kingdra', types: ['Água', 'Dragão'], level: 70 },
  { dex: 242, name: 'Blissey', types: ['Normal'], level: 62 },
  { dex: 243, name: 'Raikou', types: ['Elétrico'], level: 75 },
  { dex: 244, name: 'Entei', types: ['Fogo'], level: 75 },
  { dex: 245, name: 'Suicune', types: ['Água'], level: 75, shiny: true },
  { dex: 249, name: 'Lugia', types: ['Psíquico', 'Voador'], level: 84 },
  { dex: 250, name: 'Ho-Oh', types: ['Fogo', 'Voador'], level: 84, shiny: true },
  { dex: 251, name: 'Celebi', types: ['Psíquico', 'Planta'], level: 68 },
  { dex: 254, name: 'Sceptile', types: ['Planta'], level: 71 },
  { dex: 257, name: 'Blaziken', types: ['Fogo', 'Lutador'], level: 73 },
  { dex: 260, name: 'Swampert', types: ['Água', 'Terrestre'], level: 72 },
  { dex: 282, name: 'Gardevoir', types: ['Psíquico', 'Fada'], level: 69 },
  { dex: 292, name: 'Shedinja', types: ['Inseto', 'Fantasma'], level: 58 },
  { dex: 306, name: 'Aggron', types: ['Aço', 'Pedra'], level: 70 },
  { dex: 350, name: 'Milotic', types: ['Água'], level: 72, shiny: true },
  { dex: 359, name: 'Absol', types: ['Sombrio'], level: 67, shiny: true },
  { dex: 373, name: 'Salamence', types: ['Dragão', 'Voador'], level: 78 },
  { dex: 380, name: 'Latias', types: ['Dragão', 'Psíquico'], level: 76 },
  { dex: 381, name: 'Latios', types: ['Dragão', 'Psíquico'], level: 76 },
  { dex: 382, name: 'Kyogre', types: ['Água'], level: 85 },
  { dex: 383, name: 'Groudon', types: ['Terrestre'], level: 85, shiny: true },
  { dex: 385, name: 'Jirachi', types: ['Aço', 'Psíquico'], level: 66 },
  { dex: 386, name: 'Deoxys', types: ['Psíquico'], level: 79 },
];

export const ADVANCED_SHOWCASE_JOURNEY: AdvancedShowcaseJourney = {
  trainerId: 'KNT-073-0386',
  publicVerificationId: 'PB-KANTO-ASTER-073',
  currentLocation: 'Indigo Plateau',
  ownedPokemonCount: SHOWCASE_SPECIES.length,
  registeredSpeciesCount: 386,
  personal: {
    age: 24,
    height: '1,81 m',
    appearance:
      'Jaqueta de campo vermelha, mochila técnica e insígnia da Liga no ombro.',
    bio: 'Treinador veterano com registros completos de Kanto, Johto e Hoenn.',
  },
  badges: [
    ['boulder', 'Pedra'],
    ['cascade', 'Cascata'],
    ['thunder', 'Trovão'],
    ['rainbow', 'Arco-Íris'],
    ['soul', 'Alma'],
    ['marsh', 'Pântano'],
    ['volcano', 'Vulcão'],
    ['earth', 'Terra'],
  ].map(([key, name]) => ({ key, name, earned: true })),
};

export function isAdvancedShowcaseUrl(url: URL) {
  return url.searchParams.get(SHOWCASE_QUERY_KEY) === SHOWCASE_QUERY_VALUE;
}

export function resolveAdvancedShowcaseState(
  url: URL,
  rememberedValue: string | null,
): AdvancedShowcaseResolvedState {
  const explicitValue = url.searchParams.get(SHOWCASE_QUERY_KEY);
  if (explicitValue === SHOWCASE_QUERY_VALUE) {
    return { active: true, rememberedValue: SHOWCASE_QUERY_VALUE };
  }
  if (explicitValue !== null) {
    return { active: false, rememberedValue: null };
  }
  return {
    active: rememberedValue === SHOWCASE_QUERY_VALUE,
    rememberedValue: rememberedValue === SHOWCASE_QUERY_VALUE ? SHOWCASE_QUERY_VALUE : null,
  };
}

export function isAdvancedShowcaseActive() {
  if (typeof window === 'undefined') return false;

  let rememberedValue: string | null = null;
  try {
    rememberedValue = window.sessionStorage.getItem(SHOWCASE_SESSION_KEY);
  } catch {
    rememberedValue = null;
  }

  const resolved = resolveAdvancedShowcaseState(new URL(window.location.href), rememberedValue);

  try {
    if (resolved.rememberedValue) {
      window.sessionStorage.setItem(SHOWCASE_SESSION_KEY, resolved.rememberedValue);
    } else {
      window.sessionStorage.removeItem(SHOWCASE_SESSION_KEY);
    }
  } catch {
    // The showcase can still work for the current URL when storage is unavailable.
  }

  return resolved.active;
}

export function createAdvancedShowcasePokemon(): PlayerPortalPokemon[] {
  return SHOWCASE_SPECIES.map((species, index) => {
    const inTeam = index < 6;
    const boxIndex = Math.floor(Math.max(index - 6, 0) / 12) + 1;
    const boxSlot = (Math.max(index - 6, 0) % 12) + 1;

    return {
      pokemonInstanceId: demoUuid(1000 + species.dex),
      formId: demoUuid(5000 + species.dex),
      displayName: species.name,
      nationalDex: species.dex,
      typeNames: [...species.types],
      nickname: species.dex === 25 ? 'Volt' : null,
      level: species.level,
      currentHp: 95 + ((species.dex * 7) % 145),
      gender: species.dex % 5 === 0 ? null : species.dex % 2 === 0 ? 'F' : 'M',
      shiny: Boolean(species.shiny),
      placementKind: inTeam ? 'TEAM' : 'BOX',
      boxNo: inTeam ? null : Math.min(boxIndex, 3),
      slotNo: inTeam ? index + 1 : boxSlot,
    };
  });
}

export function createAdvancedShowcasePokedex(): PlayerPortalPokedexSpecies[] {
  return Array.from({ length: 386 }, (_, index) => {
    const nationalDex = index + 1;
    const caught = 1 + (nationalDex % 4);
    const seen = caught + 2 + (nationalDex % 5);

    return {
      nationalDex,
      seenCount: String(seen),
      caughtCount: String(caught),
      firstSeenAt: SHOWCASE_TIMESTAMP,
      lastSeenAt: SHOWCASE_TIMESTAMP,
      firstCaughtAt: SHOWCASE_TIMESTAMP,
      lastCaughtAt: SHOWCASE_TIMESTAMP,
    };
  });
}

const SHOWCASE_POKEMON = createAdvancedShowcasePokemon();
const SHOWCASE_TEAM = SHOWCASE_POKEMON.slice(0, 6).map((pokemon, index) => ({
  pokemonInstanceId: pokemon.pokemonInstanceId,
  formId: pokemon.formId,
  displayName: pokemon.displayName,
  nationalDex: pokemon.nationalDex,
  typeNames: [...pokemon.typeNames],
  nickname: pokemon.nickname,
  level: pokemon.level,
  currentHp: pokemon.currentHp,
  slotNo: index + 1,
}));

const SHOWCASE_PROFILE: PlayerPortalProfile = {
  playerId: demoUuid(73),
  playerStatus: 'ACTIVE',
  trainerName: 'Aster Vale',
  originRegionId: demoUuid(151),
  originRegionName: 'Kanto',
  locale: 'pt-BR',
  trainerLevel: 73,
  progressionPoints: '248750',
  onboardingState: 'COMPLETE',
  contentReleaseId: demoUuid(901),
  rulesetId: demoUuid(902),
  starterPokemonInstanceId: SHOWCASE_TEAM[2]?.pokemonInstanceId ?? null,
  team: SHOWCASE_TEAM,
};

export function getAdvancedShowcaseSession(): PlayerPortalSessionBootstrap {
  return {
    status: 'authenticated',
    source: 'session',
    profile: SHOWCASE_PROFILE,
  };
}
