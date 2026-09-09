export type NationalDexSpeciesItem = {
  dex: number;
  name: string;
};

type PokeApiSpeciesResponse = {
  results?: Array<{ name?: string }>;
};

const TOTAL = 386;

// Preview/player-known species must be readable on the first frame without waiting for PokéAPI.
// Unknown species intentionally keep an empty internal name because the UI renders them as ???.
const PREVIEW_KNOWN_NAMES = new Map<number, string>([
  [1, 'Bulbasaur'],
  [2, 'Ivysaur'],
  [3, 'Venusaur'],
  [4, 'Charmander'],
  [5, 'Charmeleon'],
  [6, 'Charizard'],
  [7, 'Squirtle'],
  [8, 'Wartortle'],
  [9, 'Blastoise'],
  [10, 'Caterpie'],
  [11, 'Metapod'],
  [12, 'Butterfree'],
  [16, 'Pidgey'],
  [18, 'Pidgeot'],
  [19, 'Rattata'],
  [20, 'Raticate'],
  [22, 'Fearow'],
  [24, 'Arbok'],
  [25, 'Pikachu'],
  [26, 'Raichu'],
  [41, 'Zubat'],
  [58, 'Growlithe'],
  [59, 'Arcanine'],
  [63, 'Abra'],
  [92, 'Gastly'],
  [94, 'Gengar'],
  [129, 'Magikarp'],
  [131, 'Lapras'],
  [133, 'Eevee'],
  [134, 'Vaporeon'],
  [148, 'Dragonair'],
  [149, 'Dragonite'],
  [197, 'Umbreon'],
  [245, 'Suicune'],
  [249, 'Lugia'],
  [384, 'Rayquaza'],
]);

function createBootstrapCatalog(): NationalDexSpeciesItem[] {
  return Array.from({ length: TOTAL }, (_, index) => {
    const dex = index + 1;
    return { dex, name: PREVIEW_KNOWN_NAMES.get(dex) ?? '' };
  });
}

let cachedCatalog: NationalDexSpeciesItem[] = createBootstrapCatalog();
let catalogEnriched = false;
let catalogPromise: Promise<NationalDexSpeciesItem[]> | null = null;

export function formatNationalDexName(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getCachedNationalDexCatalog() {
  return cachedCatalog;
}

export function getCachedNationalDexName(dex: number) {
  return cachedCatalog[dex - 1]?.name || undefined;
}

export function loadNationalDexCatalog(): Promise<NationalDexSpeciesItem[]> {
  if (catalogEnriched) return Promise.resolve(cachedCatalog);
  if (catalogPromise) return catalogPromise;

  catalogPromise = fetch('https://pokeapi.co/api/v2/pokemon-species?limit=386&offset=0', {
    cache: 'force-cache',
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`PokéAPI species HTTP ${response.status}`);
      const payload = (await response.json()) as PokeApiSpeciesResponse;
      const results = payload.results ?? [];
      const catalog = Array.from({ length: TOTAL }, (_, index) => {
        const rawName = results[index]?.name;
        const fallbackName = cachedCatalog[index]?.name ?? '';
        return {
          dex: index + 1,
          name: rawName ? formatNationalDexName(rawName) : fallbackName,
        };
      });
      cachedCatalog = catalog;
      catalogEnriched = true;
      return catalog;
    })
    .catch((error) => {
      console.warn('National Dex enrichment unavailable; keeping local bootstrap catalog', error);
      catalogPromise = null;
      return cachedCatalog;
    });

  return catalogPromise;
}
