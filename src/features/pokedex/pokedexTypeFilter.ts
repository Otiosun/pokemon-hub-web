export type PokedexTypeFilter = {
  slug: string;
  label: string;
};

type PokeApiTypePayload = {
  pokemon?: Array<{ pokemon?: { url?: string } }>;
};

export const POKEDEX_TYPE_FILTERS: readonly PokedexTypeFilter[] = [
  { slug: 'normal', label: 'Normal' },
  { slug: 'fire', label: 'Fogo' },
  { slug: 'water', label: 'Água' },
  { slug: 'electric', label: 'Elétrico' },
  { slug: 'grass', label: 'Planta' },
  { slug: 'ice', label: 'Gelo' },
  { slug: 'fighting', label: 'Lutador' },
  { slug: 'poison', label: 'Veneno' },
  { slug: 'ground', label: 'Terrestre' },
  { slug: 'flying', label: 'Voador' },
  { slug: 'psychic', label: 'Psíquico' },
  { slug: 'bug', label: 'Inseto' },
  { slug: 'rock', label: 'Pedra' },
  { slug: 'ghost', label: 'Fantasma' },
  { slug: 'dragon', label: 'Dragão' },
  { slug: 'dark', label: 'Sombrio' },
  { slug: 'steel', label: 'Aço' },
  { slug: 'fairy', label: 'Fada' },
] as const;

const cachedMembers = new Map<string, ReadonlySet<number>>();
const pendingMembers = new Map<string, Promise<ReadonlySet<number>>>();

function pokemonIdFromUrl(url: string | undefined) {
  if (!url) return null;
  const match = url.match(/\/pokemon\/(\d+)\/?$/);
  if (!match?.[1]) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isInteger(id) && id >= 1 && id <= 386 ? id : null;
}

export function getCachedTypeMembers(slug: string) {
  return cachedMembers.get(slug) ?? null;
}

export async function loadTypeMembers(slug: string): Promise<ReadonlySet<number>> {
  const cached = cachedMembers.get(slug);
  if (cached) return cached;

  const pending = pendingMembers.get(slug);
  if (pending) return pending;

  const request = fetch(`https://pokeapi.co/api/v2/type/${slug}`, { cache: 'force-cache' })
    .then(async (response) => {
      if (!response.ok) throw new Error(`PokéAPI type HTTP ${response.status}`);
      const payload = (await response.json()) as PokeApiTypePayload;
      const ids = new Set<number>();
      for (const entry of payload.pokemon ?? []) {
        const id = pokemonIdFromUrl(entry.pokemon?.url);
        if (id) ids.add(id);
      }
      cachedMembers.set(slug, ids);
      return ids;
    })
    .finally(() => {
      pendingMembers.delete(slug);
    });

  pendingMembers.set(slug, request);
  return request;
}
