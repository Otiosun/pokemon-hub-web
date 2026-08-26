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

export const demoCharmander: PokemonDetailView = {
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
  stats: {
    hp: 46,
    attack: 31,
    defense: 24,
    specialAttack: 29,
    specialDefense: 25,
    speed: 27,
  },
  ivs: {
    hp: 22,
    attack: 29,
    defense: 18,
    specialAttack: 24,
    specialDefense: 20,
    speed: 27,
  },
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
};
