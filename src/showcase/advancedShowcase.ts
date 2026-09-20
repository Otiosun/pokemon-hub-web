import type { PlayerPortalSessionBootstrap } from '../player-api/playerPortalSession';
import type {
  PlayerPortalBattle,
  PlayerPortalInventoryItem,
  PlayerPortalLocation,
  PlayerPortalPokedexSpecies,
  PlayerPortalPokemon,
  PlayerPortalProfile,
} from '../player-api/playerPortalClient';
import type {
  PlayerPortalPendingMoveChoice,
  PlayerPortalResolvedMoveChoice,
} from '../player-api/playerPortalMoveChoiceClient';

const SHOWCASE_QUERY_KEY = 'showcase';
const SHOWCASE_QUERY_VALUE = 'advanced';
const SHOWCASE_SESSION_KEY = 'pokemon-beyond:showcase';
const SHOWCASE_ROSTER_KEY = 'pokemon-beyond:showcase-roster:v1';
const SHOWCASE_MOVE_CHOICES_KEY = 'pokemon-beyond:showcase-move-choices:v1';
const SHOWCASE_TIMESTAMP = '2026-09-01T12:00:00.000Z';

function demoUuid(seed: number) {
  return `00000000-0000-4000-8000-${String(seed).padStart(12, '0')}`;
}

function xpToNextLevel(level: number) {
  return (level + 1) ** 3 - level ** 3;
}

function demoIvs(seed: number) {
  return {
    hp: 18 + (seed % 14),
    attack: 17 + ((seed * 3) % 15),
    defense: 16 + ((seed * 5) % 16),
    spAttack: 15 + ((seed * 7) % 17),
    spDefense: 14 + ((seed * 11) % 18),
    speed: 13 + ((seed * 13) % 19),
  };
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
  badges: ([
    ['boulder', 'Pedra'],
    ['cascade', 'Cascata'],
    ['thunder', 'Trovão'],
    ['rainbow', 'Arco-Íris'],
    ['soul', 'Alma'],
    ['marsh', 'Pântano'],
    ['volcano', 'Vulcão'],
    ['earth', 'Terra'],
  ] as const).map(([key, name]) => ({ key, name, earned: true })),
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

function showcaseSpeciesSlug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createAdvancedShowcasePokemon(): PlayerPortalPokemon[] {
  return SHOWCASE_SPECIES.map((species, index) => {
    const speciesSlug = showcaseSpeciesSlug(species.name);
    const inTeam = index < 6;
    const boxIndex = Math.floor(Math.max(index - 6, 0) / 12) + 1;
    const boxSlot = (Math.max(index - 6, 0) % 12) + 1;
    const maxHp = 130 + ((species.dex * 11) % 170);
    const currentHp = maxHp - (species.dex % 5) * 7;
    const nextLevel = xpToNextLevel(species.level);
    const xp = String((species.dex * 37) % Math.max(nextLevel, 1));
    const moveSeed = 7000 + species.dex * 10;

    return {
      pokemonInstanceId: demoUuid(1000 + species.dex),
      formId: demoUuid(5000 + species.dex),
      formSlug: speciesSlug,
      speciesSlug,
      displayName: species.name,
      nationalDex: species.dex,
      typeNames: [...species.types],
      nickname: species.dex === 25 ? 'Volt' : null,
      level: species.level,
      xp,
      xpToNextLevel: nextLevel,
      currentHp,
      maxHp,
      natureDisplayName: index % 3 === 0 ? 'Adamant' : index % 3 === 1 ? 'Timid' : 'Calm',
      abilityDisplayName: index % 2 === 0 ? 'Pressure' : 'Inner Focus',
      ivs: demoIvs(species.dex),
      gender: species.dex % 5 === 0 ? null : species.dex % 2 === 0 ? 'F' : 'M',
      shiny: Boolean(species.shiny),
      placementKind: inTeam ? 'TEAM' : 'BOX',
      boxNo: inTeam ? null : Math.min(boxIndex, 3),
      slotNo: inTeam ? index + 1 : boxSlot,
      conditions: index === 8 ? ['POISON'] : [],
      moves: Array.from({ length: 4 }, (_, moveIndex) => ({
        slotNo: moveIndex + 1,
        moveId: demoUuid(moveSeed + moveIndex),
        displayName: ['Golpe Principal', 'Cobertura', 'Controle', 'Finalizador'][moveIndex] ?? null,
        typeName: species.types[moveIndex % species.types.length] ?? null,
        category: moveIndex === 2 ? ('STATUS' as const) : moveIndex % 2 === 0 ? ('PHYSICAL' as const) : ('SPECIAL' as const),
        power: moveIndex === 2 ? null : 60 + moveIndex * 15,
        accuracy: moveIndex === 2 ? null : 100 - moveIndex * 5,
        ppCurrent: 12 + moveIndex * 3,
        maxPp: 15 + moveIndex * 3,
      })),
    };
  });
}

function parseStoredShowcasePokemon(value: string | null): PlayerPortalPokemon[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PlayerPortalPokemon[];
    if (!Array.isArray(parsed) || parsed.length !== SHOWCASE_SPECIES.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readAdvancedShowcasePokemon(): PlayerPortalPokemon[] {
  if (typeof window === 'undefined') return createAdvancedShowcasePokemon();
  try {
    return (
      parseStoredShowcasePokemon(window.sessionStorage.getItem(SHOWCASE_ROSTER_KEY)) ??
      createAdvancedShowcasePokemon()
    );
  } catch {
    return createAdvancedShowcasePokemon();
  }
}

export function writeAdvancedShowcasePokemon(
  pokemon: readonly PlayerPortalPokemon[],
): PlayerPortalPokemon[] {
  const snapshot = pokemon.map((entry) => ({
    ...entry,
    typeNames: [...entry.typeNames],
    conditions: [...entry.conditions],
    moves: entry.moves.map((move) => ({ ...move })),
    ivs: { ...entry.ivs },
  }));
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(SHOWCASE_ROSTER_KEY, JSON.stringify(snapshot));
    } catch {
      // Showcase remains interactive for the current render when storage is unavailable.
    }
  }
  return snapshot;
}

export function moveAdvancedShowcasePokemon(
  pokemonInstanceId: string,
  target: { placementKind: 'TEAM'; boxNo: null; slotNo: number } | { placementKind: 'BOX'; boxNo: number; slotNo: number },
): PlayerPortalPokemon[] {
  const current = readAdvancedShowcasePokemon();
  const source = current.find((entry) => entry.pokemonInstanceId === pokemonInstanceId);
  if (!source) return current;

  const occupant = current.find(
    (entry) =>
      entry.pokemonInstanceId !== pokemonInstanceId &&
      entry.placementKind === target.placementKind &&
      entry.boxNo === target.boxNo &&
      entry.slotNo === target.slotNo,
  );

  const sourcePlacement = {
    placementKind: source.placementKind,
    boxNo: source.boxNo,
    slotNo: source.slotNo,
  } as const;

  const next = current.map((entry) => {
    if (entry.pokemonInstanceId === pokemonInstanceId) {
      return { ...entry, ...target };
    }
    if (occupant && entry.pokemonInstanceId === occupant.pokemonInstanceId) {
      return { ...entry, ...sourcePlacement } as PlayerPortalPokemon;
    }
    return entry;
  });

  return writeAdvancedShowcasePokemon(next);
}

export function createAdvancedShowcaseInventory(): PlayerPortalInventoryItem[] {
  return [
    { itemId: demoUuid(9101), itemSlug: 'poke-ball', displayName: 'Poké Ball', quantity: '42' },
    { itemId: demoUuid(9102), itemSlug: 'great-ball', displayName: 'Great Ball', quantity: '18' },
    { itemId: demoUuid(9103), itemSlug: 'ultra-ball', displayName: 'Ultra Ball', quantity: '7' },
    { itemId: demoUuid(9104), itemSlug: 'potion', displayName: 'Potion', quantity: '12' },
    { itemId: demoUuid(9105), itemSlug: 'super-potion', displayName: 'Super Potion', quantity: '5' },
    { itemId: demoUuid(9106), itemSlug: 'full-heal', displayName: 'Full Heal', quantity: '3' },
  ];
}

export function createAdvancedShowcaseLocation(): PlayerPortalLocation {
  return {
    areaId: demoUuid(9201),
    areaSlug: 'vila-dos-arrozais',
    areaDisplayName: 'Vila dos Arrozais',
    regionId: demoUuid(9202),
    regionSlug: 'zhoulia',
    regionDisplayName: 'Zhoulia',
    safePoint: true,
    enteredAt: SHOWCASE_TIMESTAMP,
    connections: [
      {
        connectionId: demoUuid(9203),
        connectionKey: 'vila-dos-arrozais--campos-de-yun',
        destinationAreaId: demoUuid(9204),
        destinationSlug: 'campos-de-yun',
        destinationDisplayName: 'Campos de Yun',
        available: true,
      },
    ],
  };
}

export function createAdvancedShowcaseBattle(): PlayerPortalBattle {
  const pokemon = readAdvancedShowcasePokemon();
  const lead = pokemon.find((entry) => entry.placementKind === 'TEAM') ?? pokemon[0]!;
  return {
    battleType: 'WILD',
    status: 'ACTIVE',
    turnNumber: 4,
    playerSideNo: 1,
    combatants: [
      {
        sideNo: 1,
        playerSide: true,
        active: true,
        displayName: lead.nickname?.trim() || lead.displayName,
        level: lead.level,
        currentHp: lead.currentHp,
        maxHp: lead.maxHp ?? Math.max(lead.currentHp, 1),
        conditions: [...lead.conditions],
        moves: lead.moves.map((move) => ({
          slotNo: move.slotNo,
          displayName: move.displayName,
          ppCurrent: move.ppCurrent,
          maxPp: move.maxPp,
        })),
      },
      {
        sideNo: 2,
        playerSide: false,
        active: true,
        displayName: 'Absol',
        level: 67,
        currentHp: 118,
        maxHp: 164,
        conditions: [],
        moves: [
          { slotNo: 1, displayName: 'Bite', ppCurrent: 19, maxPp: 25 },
          { slotNo: 2, displayName: 'Slash', ppCurrent: 17, maxPp: 20 },
        ],
      },
    ],
  };
}

export function createAdvancedShowcaseMoveChoices(): PlayerPortalPendingMoveChoice[] {
  const pokemon = readAdvancedShowcasePokemon();
  const first = pokemon[0];
  const second = pokemon[6] ?? pokemon[1];
  const choices: PlayerPortalPendingMoveChoice[] = [];
  if (first) {
    choices.push({
      choiceId: demoUuid(9301),
      pokemonInstanceId: first.pokemonInstanceId,
      pokemonDisplayName: first.nickname?.trim() || first.displayName || 'Pokémon',
      learnLevel: first.level,
      moveId: demoUuid(9311),
      moveDisplayName: 'Dragon Claw',
      currentMoves: first.moves.map((move) => ({
        slotNo: move.slotNo,
        moveId: move.moveId,
        displayName: move.displayName ?? 'Movimento',
      })),
    });
  }
  if (second) {
    choices.push({
      choiceId: demoUuid(9302),
      pokemonInstanceId: second.pokemonInstanceId,
      pokemonDisplayName: second.nickname?.trim() || second.displayName || 'Pokémon',
      learnLevel: second.level,
      moveId: demoUuid(9312),
      moveDisplayName: 'Thunder Wave',
      currentMoves: second.moves.map((move) => ({
        slotNo: move.slotNo,
        moveId: move.moveId,
        displayName: move.displayName ?? 'Movimento',
      })),
    });
  }
  return choices;
}

function parseStoredShowcaseMoveChoices(
  value: string | null,
): PlayerPortalPendingMoveChoice[] | null {
  if (value === null) return null;
  try {
    const parsed = JSON.parse(value) as PlayerPortalPendingMoveChoice[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readAdvancedShowcaseMoveChoices(): PlayerPortalPendingMoveChoice[] {
  if (typeof window === 'undefined') return createAdvancedShowcaseMoveChoices();
  try {
    return (
      parseStoredShowcaseMoveChoices(window.sessionStorage.getItem(SHOWCASE_MOVE_CHOICES_KEY)) ??
      createAdvancedShowcaseMoveChoices()
    );
  } catch {
    return createAdvancedShowcaseMoveChoices();
  }
}

function writeAdvancedShowcaseMoveChoices(
  choices: readonly PlayerPortalPendingMoveChoice[],
): PlayerPortalPendingMoveChoice[] {
  const snapshot = choices.map((choice) => ({
    ...choice,
    currentMoves: choice.currentMoves.map((move) => ({ ...move })),
  }));
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(SHOWCASE_MOVE_CHOICES_KEY, JSON.stringify(snapshot));
    } catch {
      // Keep the in-memory showcase usable when session storage is blocked.
    }
  }
  return snapshot;
}

export function resolveAdvancedShowcaseMoveChoice(
  choiceId: string,
  replaceSlotNo: number | null,
): {
  result: PlayerPortalResolvedMoveChoice;
  choices: PlayerPortalPendingMoveChoice[];
} | null {
  const choices = readAdvancedShowcaseMoveChoices();
  const choice = choices.find((entry) => entry.choiceId === choiceId);
  if (!choice) return null;

  if (replaceSlotNo !== null) {
    const pokemon = readAdvancedShowcasePokemon();
    const nextPokemon = pokemon.map((entry) => {
      if (entry.pokemonInstanceId !== choice.pokemonInstanceId) return entry;
      return {
        ...entry,
        moves: entry.moves.map((move) =>
          move.slotNo === replaceSlotNo
            ? {
                slotNo: replaceSlotNo,
                moveId: choice.moveId,
                displayName: choice.moveDisplayName,
                typeName: null,
                category: 'STATUS' as const,
                power: null,
                accuracy: null,
                ppCurrent: 15,
                maxPp: 15,
              }
            : move,
        ),
      };
    });
    writeAdvancedShowcasePokemon(nextPokemon);
  }

  const remaining = writeAdvancedShowcaseMoveChoices(
    choices.filter((entry) => entry.choiceId !== choiceId),
  );
  return {
    result: {
      choiceId: choice.choiceId,
      pokemonInstanceId: choice.pokemonInstanceId,
      moveId: choice.moveId,
      status: replaceSlotNo === null ? 'SKIPPED' : 'RESOLVED',
      replacedSlotNo: replaceSlotNo,
      replayed: false,
    },
    choices: remaining,
  };
}

export function createAdvancedShowcasePokedex(): PlayerPortalPokedexSpecies[] {
  const shinyDexes = new Set(
    SHOWCASE_SPECIES.filter((species) => species.shiny).map((species) => species.dex),
  );

  return Array.from({ length: 386 }, (_, index) => {
    const nationalDex = index + 1;
    const caught = 1 + (nationalDex % 4);
    const seen = caught + 2 + (nationalDex % 5);
    const shinyRegistered = shinyDexes.has(nationalDex);

    return {
      nationalDex,
      seenCount: String(seen),
      caughtCount: String(caught),
      shinySeenCount: shinyRegistered ? '1' : '0',
      shinyCaughtCount: shinyRegistered ? '1' : '0',
      firstSeenAt: SHOWCASE_TIMESTAMP,
      lastSeenAt: SHOWCASE_TIMESTAMP,
      firstCaughtAt: SHOWCASE_TIMESTAMP,
      lastCaughtAt: SHOWCASE_TIMESTAMP,
      firstShinySeenAt: shinyRegistered ? SHOWCASE_TIMESTAMP : null,
      lastShinySeenAt: shinyRegistered ? SHOWCASE_TIMESTAMP : null,
      firstShinyCaughtAt: shinyRegistered ? SHOWCASE_TIMESTAMP : null,
      lastShinyCaughtAt: shinyRegistered ? SHOWCASE_TIMESTAMP : null,
    };
  });
}

function showcaseTeam(pokemon: readonly PlayerPortalPokemon[]) {
  return pokemon
    .filter((entry) => entry.placementKind === 'TEAM')
    .sort((left, right) => left.slotNo - right.slotNo)
    .slice(0, 6)
    .map((entry) => ({
      pokemonInstanceId: entry.pokemonInstanceId,
      formId: entry.formId,
      formSlug: entry.formSlug,
      speciesSlug: entry.speciesSlug,
      displayName: entry.displayName,
      nationalDex: entry.nationalDex,
      typeNames: [...entry.typeNames],
      level: entry.level,
      currentHp: entry.currentHp,
      shiny: entry.shiny,
      slotNo: entry.slotNo,
    }));
}

const SHOWCASE_PROFILE: Omit<PlayerPortalProfile, 'team' | 'starterPokemonInstanceId'> = {
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
};

export function getAdvancedShowcaseSession(): PlayerPortalSessionBootstrap {
  const pokemon = readAdvancedShowcasePokemon();
  const team = showcaseTeam(pokemon);
  return {
    status: 'authenticated',
    source: 'session',
    profile: {
      ...SHOWCASE_PROFILE,
      starterPokemonInstanceId: team[2]?.pokemonInstanceId ?? team[0]?.pokemonInstanceId ?? null,
      team,
    },
  };
}
