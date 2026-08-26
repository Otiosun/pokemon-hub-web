export type HubSection = 'pokedex' | 'pokemon' | 'team';

export type HubDestinations = Record<HubSection, string>;

const STORAGE_KEY = 'pokemon-hub:last-destinations:v1';

const DEFAULT_DESTINATIONS: HubDestinations = {
  pokedex: '/pokedex',
  pokemon: '/pokemon',
  team: '/team',
};

function isLegacyFieldDexPath(path: string) {
  return path.startsWith('/pokemon/demo-');
}

export function hubSectionForPath(path: string): HubSection | null {
  if (path === '/pokedex' || path === '/pokedex/' || path.startsWith('/pokedex/')) return 'pokedex';
  if (path === '/team' || path === '/team/' || path.startsWith('/team/')) return 'team';
  if (
    path === '/pokemon' ||
    path === '/pokemon/' ||
    (path.startsWith('/pokemon/') && !isLegacyFieldDexPath(path))
  ) {
    return 'pokemon';
  }
  return null;
}

function isDestinationValid(section: HubSection, value: unknown): value is string {
  return typeof value === 'string' && hubSectionForPath(value) === section;
}

export function readHubDestinations(): HubDestinations {
  if (typeof window === 'undefined') return { ...DEFAULT_DESTINATIONS };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DESTINATIONS };
    const parsed = JSON.parse(raw) as Partial<HubDestinations>;
    return {
      pokedex: isDestinationValid('pokedex', parsed.pokedex) ? parsed.pokedex : DEFAULT_DESTINATIONS.pokedex,
      pokemon: isDestinationValid('pokemon', parsed.pokemon) ? parsed.pokemon : DEFAULT_DESTINATIONS.pokemon,
      team: isDestinationValid('team', parsed.team) ? parsed.team : DEFAULT_DESTINATIONS.team,
    };
  } catch {
    return { ...DEFAULT_DESTINATIONS };
  }
}

export function rememberHubDestination(path: string): HubDestinations {
  const section = hubSectionForPath(path);
  const current = readHubDestinations();
  if (!section) return current;
  const next = { ...current, [section]: path };
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable in hardened/private browser contexts.
    }
  }
  return next;
}
