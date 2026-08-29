export type HubSection = 'journey' | 'pokedex' | 'box';

export type HubDestinations = Record<HubSection, string>;

const STORAGE_KEY = 'pokemon-hub:last-destinations:v2';
const LEGACY_STORAGE_KEY = 'pokemon-hub:last-destinations:v1';

const DEFAULT_DESTINATIONS: HubDestinations = {
  journey: '/jornada',
  pokedex: '/pokedex',
  box: '/pokemon',
};

function pathnameOf(location: string) {
  return location.split(/[?#]/, 1)[0] || '/';
}

function isLegacyFieldDexPath(path: string) {
  return path.startsWith('/pokemon/demo-');
}

export function hubSectionForPath(location: string): HubSection | null {
  const path = pathnameOf(location);
  if (path === '/jornada' || path === '/jornada/' || path.startsWith('/jornada/')) return 'journey';
  if (path === '/pokedex' || path === '/pokedex/' || path.startsWith('/pokedex/')) return 'pokedex';
  if (path === '/team' || path === '/team/' || path.startsWith('/team/')) return 'box';
  if (
    path === '/pokemon' ||
    path === '/pokemon/' ||
    (path.startsWith('/pokemon/') && !isLegacyFieldDexPath(path))
  ) {
    return 'box';
  }
  return null;
}

export function shouldTraverseBackForUp(
  parent: string | undefined,
  parentInHistory: boolean | undefined,
  destination: string,
) {
  return Boolean(parentInHistory && parent && parent === destination);
}

function isDestinationValid(section: HubSection, value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && hubSectionForPath(value) === section;
}

function readStoredValue(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function readLegacyBoxDestination() {
  const raw = readStoredValue(LEGACY_STORAGE_KEY);
  if (!raw) return DEFAULT_DESTINATIONS.box;
  try {
    const parsed = JSON.parse(raw) as { pokemon?: unknown; team?: unknown };
    if (isDestinationValid('box', parsed.pokemon)) return parsed.pokemon;
    if (isDestinationValid('box', parsed.team)) return parsed.team;
  } catch {
    // Ignore malformed v1 session data.
  }
  return DEFAULT_DESTINATIONS.box;
}

export function readHubDestinations(): HubDestinations {
  if (typeof window === 'undefined') return { ...DEFAULT_DESTINATIONS };
  try {
    const raw = readStoredValue(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_DESTINATIONS,
        box: readLegacyBoxDestination(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<HubDestinations>;
    return {
      journey: isDestinationValid('journey', parsed.journey) ? parsed.journey : DEFAULT_DESTINATIONS.journey,
      pokedex: isDestinationValid('pokedex', parsed.pokedex) ? parsed.pokedex : DEFAULT_DESTINATIONS.pokedex,
      box: isDestinationValid('box', parsed.box) ? parsed.box : readLegacyBoxDestination(),
    };
  } catch {
    return {
      ...DEFAULT_DESTINATIONS,
      box: readLegacyBoxDestination(),
    };
  }
}

export function rememberHubDestination(location: string): HubDestinations {
  const section = hubSectionForPath(location);
  const current = readHubDestinations();
  if (!section) return current;
  const next = { ...current, [section]: location };
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable in hardened/private browser contexts.
    }
  }
  return next;
}
