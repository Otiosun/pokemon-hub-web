// Prototype-only data source. Replace this mock with the RPG API adapter without moving mechanics into the frontend.
export type PokemonMoveView = {
  name: string;
  type: string;
  category: 'physical' | 'special' | 'status';
  pp: { current: number; max: number };
};

export type PokemonDetailView = {
  instanceId: string;
  speciesId: number;
  species: string;
  nickname: string | null;
  level: number;
  sex: 'male' | 'female' | 'genderless';
  shiny: boolean;
  types: string[];
  hp: { current: number; max: number };
  xp: { current: number; nextLevel: number };
  nature: string;
  ability: string;
  status: string | null;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  moves: PokemonMoveView[];
  capture: {
    location: string;
    dateLabel: string;
    ball: string;
  };
};

const baseStats = {
  hp: 46,
  attack: 31,
  defense: 24,
  specialAttack: 29,
  specialDefense: 25,
  speed: 27,
};

const baseIvs = {
  hp: 22,
  attack: 29,
  defense: 18,
  specialAttack: 24,
  specialDefense: 20,
  speed: 27,
};

const reviewSpecies: Record<string, PokemonDetailView> = {
  'demo-charmander': {
    instanceId: 'demo-charmander',
    speciesId: 4,
    species: 'Charmander',
    nickname: null,
    level: 18,
    sex: 'male',
    shiny: false,
    types: ['Fogo'],
    hp: { current: 42, max: 46 },
    xp: { current: 820, nextLevel: 1200 },
    nature: 'Brave',
    ability: 'Blaze',
    status: null,
    stats: baseStats,
    ivs: baseIvs,
    moves: [
      { name: 'Ember', type: 'Fogo', category: 'special', pp: { current: 22, max: 25 } },
      { name: 'Scratch', type: 'Normal', category: 'physical', pp: { current: 35, max: 35 } },
      { name: 'Growl', type: 'Normal', category: 'status', pp: { current: 38, max: 40 } },
      { name: 'Smokescreen', type: 'Normal', category: 'status', pp: { current: 20, max: 20 } },
    ],
    capture: {
      location: 'Pallet Town',
      dateLabel: 'Seu primeiro parceiro',
      ball: 'Poké Ball',
    },
  },
  'demo-caterpie': {
    instanceId: 'demo-caterpie',
    speciesId: 10,
    species: 'Caterpie',
    nickname: null,
    level: 5,
    sex: 'male',
    shiny: false,
    types: ['Inseto'],
    hp: { current: 18, max: 18 },
    xp: { current: 80, nextLevel: 140 },
    nature: 'Docile',
    ability: 'Shield Dust',
    status: null,
    stats: { ...baseStats, hp: 18, attack: 9, defense: 10, specialAttack: 8, specialDefense: 8, speed: 12 },
    ivs: baseIvs,
    moves: [
      { name: 'Tackle', type: 'Normal', category: 'physical', pp: { current: 35, max: 35 } },
      { name: 'String Shot', type: 'Inseto', category: 'status', pp: { current: 40, max: 40 } },
      { name: 'Bug Bite', type: 'Inseto', category: 'physical', pp: { current: 20, max: 20 } },
      { name: 'Electroweb', type: 'Elétrico', category: 'special', pp: { current: 15, max: 15 } },
    ],
    capture: { location: 'Viridian Forest', dateLabel: 'Amostra de enquadramento', ball: 'Poké Ball' },
  },
  'demo-suicune': {
    instanceId: 'demo-suicune',
    speciesId: 245,
    species: 'Suicune',
    nickname: null,
    level: 50,
    sex: 'genderless',
    shiny: false,
    types: ['Água'],
    hp: { current: 160, max: 160 },
    xp: { current: 0, nextLevel: 1 },
    nature: 'Calm',
    ability: 'Pressure',
    status: null,
    stats: { ...baseStats, hp: 160, defense: 130, specialDefense: 150, speed: 105 },
    ivs: baseIvs,
    moves: [
      { name: 'Water Pulse', type: 'Água', category: 'special', pp: { current: 20, max: 20 } },
      { name: 'Aurora Beam', type: 'Gelo', category: 'special', pp: { current: 20, max: 20 } },
      { name: 'Calm Mind', type: 'Psíquico', category: 'status', pp: { current: 20, max: 20 } },
      { name: 'Gust', type: 'Voador', category: 'special', pp: { current: 35, max: 35 } },
    ],
    capture: { location: 'Johto', dateLabel: 'Amostra de enquadramento', ball: 'Poké Ball' },
  },
  'demo-lugia': {
    instanceId: 'demo-lugia',
    speciesId: 249,
    species: 'Lugia',
    nickname: null,
    level: 70,
    sex: 'genderless',
    shiny: false,
    types: ['Psíquico', 'Voador'],
    hp: { current: 250, max: 250 },
    xp: { current: 0, nextLevel: 1 },
    nature: 'Calm',
    ability: 'Pressure',
    status: null,
    stats: { ...baseStats, hp: 250, defense: 180, specialDefense: 210, speed: 150 },
    ivs: baseIvs,
    moves: [
      { name: 'Aeroblast', type: 'Voador', category: 'special', pp: { current: 5, max: 5 } },
      { name: 'Extrasensory', type: 'Psíquico', category: 'special', pp: { current: 20, max: 20 } },
      { name: 'Recover', type: 'Normal', category: 'status', pp: { current: 10, max: 10 } },
      { name: 'Hydro Pump', type: 'Água', category: 'special', pp: { current: 5, max: 5 } },
    ],
    capture: { location: 'Whirl Islands', dateLabel: 'Amostra de enquadramento', ball: 'Poké Ball' },
  },
  'demo-rayquaza': {
    instanceId: 'demo-rayquaza',
    speciesId: 384,
    species: 'Rayquaza',
    nickname: null,
    level: 70,
    sex: 'genderless',
    shiny: false,
    types: ['Dragão', 'Voador'],
    hp: { current: 230, max: 230 },
    xp: { current: 0, nextLevel: 1 },
    nature: 'Adamant',
    ability: 'Air Lock',
    status: null,
    stats: { ...baseStats, hp: 230, attack: 240, specialAttack: 220, speed: 180 },
    ivs: baseIvs,
    moves: [
      { name: 'Dragon Pulse', type: 'Dragão', category: 'special', pp: { current: 10, max: 10 } },
      { name: 'Air Slash', type: 'Voador', category: 'special', pp: { current: 15, max: 15 } },
      { name: 'Crunch', type: 'Sombrio', category: 'physical', pp: { current: 15, max: 15 } },
      { name: 'Dragon Dance', type: 'Dragão', category: 'status', pp: { current: 20, max: 20 } },
    ],
    capture: { location: 'Sky Pillar', dateLabel: 'Amostra de enquadramento', ball: 'Poké Ball' },
  },
};

export function getReviewPokemon(routeSlug: string): PokemonDetailView {
  return reviewSpecies[routeSlug] ?? reviewSpecies['demo-charmander'];
}
