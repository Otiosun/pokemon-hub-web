export type NationalDexSpeciesItem = {
  dex: number;
  name: string;
};

type PokeApiSpeciesResponse = {
  results?: Array<{ name?: string }>;
};

const TOTAL = 386;
let cachedCatalog: NationalDexSpeciesItem[] | null = null;
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
  return cachedCatalog?.[dex - 1]?.name;
}

export function loadNationalDexCatalog(): Promise<NationalDexSpeciesItem[]> {
  if (cachedCatalog) return Promise.resolve(cachedCatalog);
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
        if (!rawName) throw new Error(`National Dex name missing for #${index + 1}`);
        return { dex: index + 1, name: formatNationalDexName(rawName) };
      });
      cachedCatalog = catalog;
      return catalog;
    })
    .catch((error) => {
      catalogPromise = null;
      throw error;
    });

  return catalogPromise;
}
