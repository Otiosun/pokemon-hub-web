import { formatNationalDexName } from './nationalDexRuntime';

export type EvolutionSpecies = {
  dex: number;
  name: string;
};

export type SpeciesVariety = {
  name: string;
  isDefault: boolean;
};

export type PokedexSpeciesRuntimeData = {
  dex: number;
  name: string;
  height: number | null;
  weight: number | null;
  typeSlugs: string[];
  cryUrl: string | null;
  habitat: string;
  varieties: SpeciesVariety[];
  evolutionStages: EvolutionSpecies[][];
};

type PokemonPayload = {
  name?: string;
  height?: number;
  weight?: number;
  types?: Array<{ slot?: number; type?: { name?: string } }>;
  cries?: { latest?: string | null; legacy?: string | null };
};

type PokemonSpeciesPayload = {
  habitat?: { name?: string } | null;
  varieties?: Array<{ is_default?: boolean; pokemon?: { name?: string } }>;
  evolution_chain?: { url?: string } | null;
};

type EvolutionChainNode = {
  species?: { name?: string; url?: string };
  evolves_to?: EvolutionChainNode[];
};

type EvolutionPayload = {
  chain?: EvolutionChainNode;
};

const cache = new Map<number, PokedexSpeciesRuntimeData>();

const HABITAT_LABELS: Record<string, string> = {
  cave: 'Caverna',
  forest: 'Floresta',
  grassland: 'Campina',
  mountain: 'Montanha',
  rare: 'Raro',
  'rough-terrain': 'Terreno acidentado',
  sea: 'Mar',
  urban: 'Urbano',
  'waters-edge': "Beira d'água",
};

function parseSpeciesDex(url: string | undefined) {
  if (!url) return null;
  const match = url.match(/\/pokemon-species\/(\d+)\/?$/);
  if (!match?.[1]) return null;
  const dex = Number.parseInt(match[1], 10);
  return Number.isInteger(dex) && dex >= 1 && dex <= 386 ? dex : null;
}

function buildEvolutionStages(chain: EvolutionChainNode | undefined) {
  const stages: EvolutionSpecies[][] = [];
  if (!chain) return stages;

  function visit(node: EvolutionChainNode, depth: number) {
    const dex = parseSpeciesDex(node.species?.url);
    const name = node.species?.name;
    if (dex && name) {
      const stage = stages[depth] ?? [];
      if (!stage.some((species) => species.dex === dex)) {
        stage.push({ dex, name: formatNationalDexName(name) });
      }
      stages[depth] = stage;
    }
    for (const child of node.evolves_to ?? []) visit(child, depth + 1);
  }

  visit(chain, 0);
  return stages.filter((stage) => stage.length > 0);
}

function requestInit(signal?: AbortSignal): RequestInit {
  return signal ? { signal, cache: 'force-cache' } : { cache: 'force-cache' };
}

async function loadEvolutionStages(url: string | undefined, signal?: AbortSignal) {
  if (!url) return [];
  const response = await fetch(url, requestInit(signal));
  if (!response.ok) throw new Error(`PokéAPI evolution HTTP ${response.status}`);
  const payload = (await response.json()) as EvolutionPayload;
  return buildEvolutionStages(payload.chain);
}

export function getCachedPokedexSpeciesRuntime(dex: number) {
  return cache.get(dex) ?? null;
}

export async function loadPokedexSpeciesRuntime(dex: number, signal?: AbortSignal) {
  const cached = cache.get(dex);
  if (cached) return cached;

  const [pokemonResponse, speciesResponse] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${dex}`, requestInit(signal)),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${dex}`, requestInit(signal)),
  ]);

  if (!pokemonResponse.ok) throw new Error(`PokéAPI pokemon HTTP ${pokemonResponse.status}`);
  if (!speciesResponse.ok) throw new Error(`PokéAPI species HTTP ${speciesResponse.status}`);

  const [pokemon, species] = await Promise.all([
    pokemonResponse.json() as Promise<PokemonPayload>,
    speciesResponse.json() as Promise<PokemonSpeciesPayload>,
  ]);

  let evolutionStages: EvolutionSpecies[][] = [];
  try {
    evolutionStages = await loadEvolutionStages(species.evolution_chain?.url, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn(`Evolution chain unavailable for National Dex ${dex}`, error);
  }

  const typeSlugs = [...(pokemon.types ?? [])]
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((item) => item.type?.name)
    .filter((value): value is string => Boolean(value));

  const varieties = (species.varieties ?? [])
    .map((variety) => {
      const name = variety.pokemon?.name;
      if (!name) return null;
      return {
        name: formatNationalDexName(name),
        isDefault: Boolean(variety.is_default),
      } satisfies SpeciesVariety;
    })
    .filter((value): value is SpeciesVariety => value !== null);

  const habitatSlug = species.habitat?.name ?? '';
  const result: PokedexSpeciesRuntimeData = {
    dex,
    name: pokemon.name ? formatNationalDexName(pokemon.name) : `Nº ${String(dex).padStart(3, '0')}`,
    height: typeof pokemon.height === 'number' ? pokemon.height / 10 : null,
    weight: typeof pokemon.weight === 'number' ? pokemon.weight / 10 : null,
    typeSlugs,
    cryUrl: pokemon.cries?.latest ?? pokemon.cries?.legacy ?? null,
    habitat: HABITAT_LABELS[habitatSlug] ?? (habitatSlug ? formatNationalDexName(habitatSlug) : 'Não catalogado'),
    varieties,
    evolutionStages,
  };

  cache.set(dex, result);
  return result;
}
