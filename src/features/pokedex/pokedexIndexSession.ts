export type PokedexRegionFilter = 'Todos' | 'Kanto' | 'Johto' | 'Hoenn';

type PokedexIndexSession = {
  query: string;
  region: PokedexRegionFilter;
  typeSlug: string | null;
  scrollY: number;
};

const session: PokedexIndexSession = {
  query: '',
  region: 'Todos',
  typeSlug: null,
  scrollY: 0,
};

export function readPokedexIndexSession(): PokedexIndexSession {
  return { ...session };
}

export function rememberPokedexIndexFilters(
  query: string,
  region: PokedexRegionFilter,
  typeSlug: string | null,
) {
  session.query = query;
  session.region = region;
  session.typeSlug = typeSlug;
}

export function rememberPokedexIndexScroll(scrollY: number) {
  session.scrollY = Math.max(0, Math.round(scrollY));
}
