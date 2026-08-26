import {
  getPokemonSpeciesVisualAssets,
  type PokemonSpeciesVisualAssets,
} from '../../visual-assets/pokemonVisualRegistry';

export type FieldDexSpecies = {
  routeSlug: string;
  dex: number;
  slug: string;
  name: string;
  region: 'Kanto' | 'Johto' | 'Hoenn';
  category: string;
  description: string;
  height: string;
  weight: string;
  types: string[];
};

export type FieldDexVisual = PokemonSpeciesVisualAssets;

const reviewSpecies = [
  {
    routeSlug: 'demo-charmander',
    dex: 4,
    slug: 'charmander',
    name: 'Charmander',
    region: 'Kanto',
    category: 'Pokémon Lagarto',
    description:
      'A chama na ponta de sua cauda demonstra sua força vital. Desde o nascimento, ela permanece acesa e reage ao seu estado.',
    height: '0,6 m',
    weight: '8,5 kg',
    types: ['Fogo'],
  },
  {
    routeSlug: 'demo-caterpie',
    dex: 10,
    slug: 'caterpie',
    name: 'Caterpie',
    region: 'Kanto',
    category: 'Pokémon Minhoca',
    description:
      'Seu corpo pequeno é protegido por uma pele resistente. As antenas liberam um odor forte quando ele precisa afastar ameaças.',
    height: '0,3 m',
    weight: '2,9 kg',
    types: ['Inseto'],
  },
  {
    routeSlug: 'demo-suicune',
    dex: 245,
    slug: 'suicune',
    name: 'Suicune',
    region: 'Johto',
    category: 'Pokémon Aurora',
    description:
      'Percorre grandes distâncias com movimentos leves e silenciosos. É associado a águas puras e aos ventos do norte.',
    height: '2,0 m',
    weight: '187,0 kg',
    types: ['Água'],
  },
  {
    routeSlug: 'demo-lugia',
    dex: 249,
    slug: 'lugia',
    name: 'Lugia',
    region: 'Johto',
    category: 'Pokémon Mergulho',
    description:
      'Passa longos períodos nas profundezas do oceano. A força de suas asas é suficiente para alterar violentamente o ar ao redor.',
    height: '5,2 m',
    weight: '216,0 kg',
    types: ['Psíquico', 'Voador'],
  },
  {
    routeSlug: 'demo-rayquaza',
    dex: 384,
    slug: 'rayquaza',
    name: 'Rayquaza',
    region: 'Hoenn',
    category: 'Pokémon Altíssimo',
    description:
      'Vive nas camadas mais altas da atmosfera e raramente é observado do solo. Seu corpo serpentino atravessa o céu em grandes arcos.',
    height: '7,0 m',
    weight: '206,5 kg',
    types: ['Dragão', 'Voador'],
  },
] satisfies FieldDexSpecies[];

function requireSpecies(species: FieldDexSpecies | undefined): FieldDexSpecies {
  if (!species) throw new Error('Field Dex review registry is empty');
  return species;
}

const defaultSpecies = requireSpecies(reviewSpecies[0]);

export const FIELD_DEX_REVIEW_SPECIES: readonly FieldDexSpecies[] = reviewSpecies;

const byRoute = new Map(reviewSpecies.map((species) => [species.routeSlug, species]));

export function getFieldDexSpecies(routeSlug: string): FieldDexSpecies {
  return byRoute.get(routeSlug) ?? defaultSpecies;
}

export function getFieldDexNeighbours(routeSlug: string): {
  previous: FieldDexSpecies;
  next: FieldDexSpecies;
} {
  const index = Math.max(
    0,
    reviewSpecies.findIndex((species) => species.routeSlug === routeSlug),
  );
  const previous = reviewSpecies[(index - 1 + reviewSpecies.length) % reviewSpecies.length] ?? defaultSpecies;
  const next = reviewSpecies[(index + 1) % reviewSpecies.length] ?? defaultSpecies;
  return { previous, next };
}

export function getFieldDexVisual(dex: number): FieldDexVisual {
  return getPokemonSpeciesVisualAssets(dex);
}

export function typeAccent(type: string) {
  const accents: Record<string, string> = {
    Fogo: '#e35f3c',
    Água: '#4d9bd8',
    Inseto: '#91a735',
    Psíquico: '#d85e91',
    Voador: '#86a8df',
    Dragão: '#7f67c8',
    Normal: '#9a9d96',
    Gelo: '#71c8ca',
    Elétrico: '#d9b83f',
    Sombrio: '#6f6671',
  };
  return accents[type] ?? '#94a7aa';
}
