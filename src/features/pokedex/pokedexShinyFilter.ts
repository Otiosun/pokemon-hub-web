export type PokedexShinyFilter = 'Todos' | 'Shiny';

type ShinyPokemonLike = {
  nationalDex: number | null;
  shiny: boolean;
};

export function buildOwnedShinyDexSet(pokemon: readonly ShinyPokemonLike[]) {
  const shinyDexes = new Set<number>();
  for (const item of pokemon) {
    if (!item.shiny || item.nationalDex === null) continue;
    if (!Number.isInteger(item.nationalDex) || item.nationalDex < 1) continue;
    shinyDexes.add(item.nationalDex);
  }
  return shinyDexes;
}

export function matchesPokedexShinyFilter(
  filter: PokedexShinyFilter,
  dex: number,
  shinyDexes: ReadonlySet<number>,
) {
  return filter === 'Todos' || shinyDexes.has(dex);
}
