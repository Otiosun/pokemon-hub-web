import { formatNationalDexName } from './nationalDexRuntime';

export type EvolutionSpecies = {
  dex: number;
  name: string;
};

export type EvolutionTreeNode = {
  species: EvolutionSpecies;
  conditions: string[];
  children: EvolutionTreeNode[];
};

export type SpeciesVariety = {
  name: string;
  slug: string;
  isDefault: boolean;
};

export type PokedexSpeciesRuntimeData = {
  dex: number;
  slug: string;
  name: string;
  height: number | null;
  weight: number | null;
  typeSlugs: string[];
  cryUrl: string | null;
  habitat: string;
  varieties: SpeciesVariety[];
  evolutionTree: EvolutionTreeNode | null;
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

type EvolutionDetail = {
  gender?: number | null;
  held_item?: { name?: string } | null;
  item?: { name?: string } | null;
  known_move?: { name?: string } | null;
  known_move_type?: { name?: string } | null;
  location?: { name?: string } | null;
  min_affection?: number | null;
  min_beauty?: number | null;
  min_happiness?: number | null;
  min_level?: number | null;
  needs_overworld_rain?: boolean;
  party_species?: { name?: string } | null;
  party_type?: { name?: string } | null;
  relative_physical_stats?: number | null;
  time_of_day?: string;
  trade_species?: { name?: string } | null;
  trigger?: { name?: string } | null;
  turn_upside_down?: boolean;
};

type EvolutionChainNode = {
  species?: { name?: string; url?: string };
  evolution_details?: EvolutionDetail[];
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

const TIME_LABELS: Record<string, string> = {
  day: 'Durante o dia',
  night: 'Durante a noite',
};

function parseSpeciesDex(url: string | undefined) {
  if (!url) return null;
  const match = url.match(/\/pokemon-species\/(\d+)\/?$/);
  if (!match?.[1]) return null;
  const dex = Number.parseInt(match[1], 10);
  return Number.isInteger(dex) && dex >= 1 && dex <= 386 ? dex : null;
}

function displayResource(value: { name?: string } | null | undefined) {
  const name = value?.name;
  return name ? formatNationalDexName(name) : null;
}

function evolutionConditions(details: readonly EvolutionDetail[] | undefined) {
  if (!details?.length) return [];

  const labels = new Set<string>();
  for (const detail of details) {
    const item = displayResource(detail.item);
    const heldItem = displayResource(detail.held_item);
    const knownMove = displayResource(detail.known_move);
    const knownMoveType = displayResource(detail.known_move_type);
    const location = displayResource(detail.location);
    const partySpecies = displayResource(detail.party_species);
    const partyType = displayResource(detail.party_type);
    const tradeSpecies = displayResource(detail.trade_species);

    if (item) labels.add(`Usar ${item}`);
    if (typeof detail.min_level === 'number') labels.add(`Nível ${detail.min_level}`);
    if (typeof detail.min_happiness === 'number') {
      labels.add(`Amizade ≥ ${detail.min_happiness}`);
    }
    if (typeof detail.min_affection === 'number') {
      labels.add(`Afeição ≥ ${detail.min_affection}`);
    }
    if (typeof detail.min_beauty === 'number') {
      labels.add(`Beleza ≥ ${detail.min_beauty}`);
    }
    if (heldItem) labels.add(`Segurando ${heldItem}`);
    if (knownMove) labels.add(`Conhecendo ${knownMove}`);
    if (knownMoveType) labels.add(`Golpe do tipo ${knownMoveType}`);
    if (location) labels.add(`Em ${location}`);
    if (partySpecies) labels.add(`${partySpecies} no grupo`);
    if (partyType) labels.add(`Pokémon ${partyType} no grupo`);
    if (tradeSpecies) labels.add(`Troca por ${tradeSpecies}`);
    if (detail.time_of_day) {
      labels.add(TIME_LABELS[detail.time_of_day] ?? formatNationalDexName(detail.time_of_day));
    }
    if (detail.needs_overworld_rain) labels.add('Durante chuva');
    if (detail.turn_upside_down) labels.add('Dispositivo de cabeça para baixo');
    if (detail.gender === 1) labels.add('Fêmea');
    if (detail.gender === 2) labels.add('Macho');
    if (detail.relative_physical_stats === 1) labels.add('Ataque > Defesa');
    if (detail.relative_physical_stats === -1) labels.add('Ataque < Defesa');
    if (detail.relative_physical_stats === 0) labels.add('Ataque = Defesa');

    const trigger = detail.trigger?.name;
    if (trigger === 'trade' && !tradeSpecies) labels.add('Troca');
    if (trigger === 'level-up' && labels.size === 0) labels.add('Subir de nível');
    if (trigger === 'use-item' && !item) labels.add('Usar item');
    if (trigger && !['trade', 'level-up', 'use-item'].includes(trigger)) {
      labels.add(formatNationalDexName(trigger));
    }
  }

  return [...labels];
}

function buildEvolutionTree(chain: EvolutionChainNode | undefined): EvolutionTreeNode | null {
  if (!chain) return null;

  function visit(node: EvolutionChainNode): EvolutionTreeNode[] {
    const childNodes = (node.evolves_to ?? []).flatMap(visit);
    const dex = parseSpeciesDex(node.species?.url);
    const name = node.species?.name;

    if (!dex || !name) return childNodes;

    return [{
      species: { dex, name: formatNationalDexName(name) },
      conditions: evolutionConditions(node.evolution_details),
      children: childNodes,
    }];
  }

  const roots = visit(chain);
  if (roots.length === 0) return null;
  const [root, ...siblings] = roots;
  if (!root) return null;

  return {
    ...root,
    conditions: [],
    children: siblings.length > 0 ? [...root.children, ...siblings] : root.children,
  };
}

function requestInit(signal?: AbortSignal): RequestInit {
  return signal ? { signal, cache: 'force-cache' } : { cache: 'force-cache' };
}

async function loadEvolutionTree(url: string | undefined, signal?: AbortSignal) {
  if (!url) return null;
  const response = await fetch(url, requestInit(signal));
  if (!response.ok) throw new Error(`PokéAPI evolution HTTP ${response.status}`);
  const payload = (await response.json()) as EvolutionPayload;
  return buildEvolutionTree(payload.chain);
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

  let evolutionTree: EvolutionTreeNode | null = null;
  try {
    evolutionTree = await loadEvolutionTree(species.evolution_chain?.url, signal);
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
      const slug = variety.pokemon?.name?.trim().toLowerCase();
      if (!slug) return null;
      return {
        name: formatNationalDexName(slug),
        slug,
        isDefault: Boolean(variety.is_default),
      } satisfies SpeciesVariety;
    })
    .filter((value): value is SpeciesVariety => value !== null);

  const habitatSlug = species.habitat?.name ?? '';
  const slug = pokemon.name?.trim().toLowerCase() ?? '';
  const result: PokedexSpeciesRuntimeData = {
    dex,
    slug,
    name: slug ? formatNationalDexName(slug) : `Nº ${String(dex).padStart(3, '0')}`,
    height: typeof pokemon.height === 'number' ? pokemon.height / 10 : null,
    weight: typeof pokemon.weight === 'number' ? pokemon.weight / 10 : null,
    typeSlugs,
    cryUrl: pokemon.cries?.latest ?? pokemon.cries?.legacy ?? null,
    habitat: HABITAT_LABELS[habitatSlug] ?? (habitatSlug ? formatNationalDexName(habitatSlug) : 'Não catalogado'),
    varieties,
    evolutionTree,
  };

  cache.set(dex, result);
  return result;
}
