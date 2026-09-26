export type ProductRouteResolution =
  | { kind: 'route' }
  | { kind: 'redirect'; to: string }
  | { kind: 'not-found' };

const LEGACY_SPECIES_REDIRECTS: Readonly<Record<string, string>> = {
  '/pokemon/demo-charmander': '/pokedex/4',
  '/pokemon/demo-caterpie': '/pokedex/10',
  '/pokemon/demo-suicune': '/pokedex/245',
  '/pokemon/demo-lugia': '/pokedex/249',
  '/pokemon/demo-rayquaza': '/pokedex/384',
};

function normalizePath(path: string) {
  if (path === '/') return path;
  return path.replace(/\/+$/, '');
}

function isValidPokedexRecord(path: string) {
  const match = path.match(/^\/pokedex\/(\d+)$/);
  if (!match) return false;
  const dex = Number.parseInt(match[1] ?? '', 10);
  return Number.isInteger(dex) && dex >= 1 && dex <= 386;
}

export function resolveProductRoute(path: string): ProductRouteResolution {
  const normalized = normalizePath(path);
  const legacyRedirect = LEGACY_SPECIES_REDIRECTS[normalized];
  if (legacyRedirect) return { kind: 'redirect', to: legacyRedirect };
  if (normalized === '/jornada/movimentos') {
    return { kind: 'redirect', to: '/jornada' };
  }

  if (normalized.startsWith('/pokemon/demo-')) return { kind: 'not-found' };
  if (normalized === '/asset-lab' || normalized.startsWith('/asset-lab/')) {
    return { kind: 'not-found' };
  }

  if (
    normalized === '/' ||
    normalized === '/jornada' ||
    normalized === '/jornada/inventario' ||
    normalized === '/pokedex' ||
    normalized === '/pokemon' ||
    normalized === '/team' ||
    normalized === '/champion-store' ||
    normalized === '/admin'
  ) {
    return { kind: 'route' };
  }

  if (isValidPokedexRecord(normalized)) return { kind: 'route' };

  if (/^\/pokemon\/[^/]+$/.test(normalized)) return { kind: 'route' };

  if (
    normalized === '/admin/players' ||
    normalized === '/admin/rewards' ||
    normalized === '/admin/team' ||
    normalized === '/admin/content' ||
    normalized === '/admin/audit'
  ) {
    return { kind: 'route' };
  }
  if (
    /^\/admin\/players\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
  ) {
    return { kind: 'route' };
  }

  return { kind: 'not-found' };
}
