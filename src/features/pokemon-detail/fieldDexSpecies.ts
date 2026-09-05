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

export const FIELD_DEX_REVIEW_SPECIES: readonly FieldDexSpecies[] = reviewSpecies;

export function typeAccent(type: string) {
  const accents: Record<string, string> = {
    Normal: '#828282',
    Fogo: '#e4613e',
    Água: '#3099e1',
    Elétrico: '#dfbc28',
    Planta: '#439837',
    Gelo: '#47c8c8',
    Lutador: '#e49021',
    Veneno: '#9354cb',
    Terrestre: '#a4733c',
    Voador: '#74aad0',
    Psíquico: '#e96c8c',
    Inseto: '#9f9f28',
    Pedra: '#a9a481',
    Fantasma: '#6f4570',
    Dragão: '#576fbc',
    Sombrio: '#4f4747',
    Aço: '#74b0cb',
    Fada: '#e18ce1',
  };
  return accents[type] ?? '#94a7aa';
}
