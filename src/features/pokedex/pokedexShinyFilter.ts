export type PokedexShinyFilter = 'Todos' | 'Shiny';

type ShinyPokedexLike = {
  nationalDex: number;
  shinySeenCount?: string;
  shinyCaughtCount?: string;
};

function positiveCount(value: string | undefined) {
  if (value === undefined) return false;
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

export function buildRegisteredShinyDexSet(entries: readonly ShinyPokedexLike[]) {
  const shinyDexes = new Set<number>();
  for (const entry of entries) {
    if (!Number.isInteger(entry.nationalDex) || entry.nationalDex < 1) continue;
    if (!positiveCount(entry.shinySeenCount) && !positiveCount(entry.shinyCaughtCount)) continue;
    shinyDexes.add(entry.nationalDex);
  }
  return shinyDexes;
}

export function hasShinyHistoryContract(entries: readonly ShinyPokedexLike[]) {
  return entries.length === 0 || entries.every(
    (entry) => entry.shinySeenCount !== undefined && entry.shinyCaughtCount !== undefined,
  );
}

export function matchesPokedexShinyFilter(
  filter: PokedexShinyFilter,
  dex: number,
  shinyDexes: ReadonlySet<number>,
) {
  return filter === 'Todos' || shinyDexes.has(dex);
}
