export type PokedexRegionFilter = 'Todos' | 'Kanto' | 'Johto' | 'Hoenn';
export type PokedexDiscoveryFilter = 'Todos' | 'Avistados' | 'Capturados' | 'Desconhecidos';
export type PokedexShinySessionFilter = 'Todos' | 'Shiny';

type PokedexIndexSession = {
  query: string;
  region: PokedexRegionFilter;
  discovery: PokedexDiscoveryFilter;
  shiny: PokedexShinySessionFilter;
  typeSlug: string | null;
  scrollY: number;
};

const session: PokedexIndexSession = {
  query: '',
  region: 'Todos',
  discovery: 'Todos',
  shiny: 'Todos',
  typeSlug: null,
  scrollY: 0,
};

export function readPokedexIndexSession(): PokedexIndexSession {
  return { ...session };
}

export function rememberPokedexIndexFilters(
  query: string,
  region: PokedexRegionFilter,
  discovery: PokedexDiscoveryFilter,
  shiny: PokedexShinySessionFilter,
  typeSlug: string | null,
) {
  session.query = query;
  session.region = region;
  session.discovery = discovery;
  session.shiny = shiny;
  session.typeSlug = typeSlug;
}

export function rememberPokedexIndexScroll(scrollY: number) {
  session.scrollY = Math.max(0, Math.round(scrollY));
}
