export type PokedexRegionFilter = 'Todos' | 'Kanto' | 'Johto' | 'Hoenn';

type PokedexIndexSession = {
  query: string;
  region: PokedexRegionFilter;
  scrollY: number;
};

const session: PokedexIndexSession = {
  query: '',
  region: 'Todos',
  scrollY: 0,
};

export function readPokedexIndexSession(): PokedexIndexSession {
  return { ...session };
}

export function rememberPokedexIndexFilters(query: string, region: PokedexRegionFilter) {
  session.query = query;
  session.region = region;
}

export function rememberPokedexIndexScroll(scrollY: number) {
  session.scrollY = Math.max(0, Math.round(scrollY));
}
