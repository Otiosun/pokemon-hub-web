import { resolveProductRoute } from './productIntegrity';

export type ProductRouteChunk =
  | 'journey'
  | 'inventory'
  | 'pokedex-index'
  | 'pokedex-species'
  | 'box'
  | 'owned-pokemon'
  | 'team'
  | 'admin';

const PRODUCT_ROUTE_LOADERS: Record<ProductRouteChunk, () => Promise<unknown>> = {
  journey: () => import('../features/journey/JourneyPage'),
  inventory: () => import('../features/inventory/InventoryPage'),
  'pokedex-index': () => import('../features/pokedex/PokedexIndexPage'),
  'pokedex-species': () => import('../features/pokedex/PokedexSpeciesPage'),
  box: () => import('../features/collection/OwnedPokemonCollectionPage'),
  'owned-pokemon': () => import('../features/collection/OwnedPokemonDetailPage'),
  team: () => import('../features/team/TeamPage'),
  admin: () => import('../features/admin/AdminShellPage'),
};

const warmedChunks = new Map<ProductRouteChunk, Promise<unknown>>();

function normalizePath(path: string) {
  if (path === '/') return path;
  return path.replace(/\/+$/, '');
}

export function productRouteChunk(path: string): ProductRouteChunk | null {
  const resolution = resolveProductRoute(path);
  if (resolution.kind === 'redirect') return productRouteChunk(resolution.to);
  if (resolution.kind !== 'route') return null;

  const normalized = normalizePath(path);
  if (normalized === '/' || normalized === '/jornada') return 'journey';
  if (normalized === '/jornada/inventario') return 'inventory';
  if (normalized === '/pokedex') return 'pokedex-index';
  if (normalized === '/pokemon') return 'box';
  if (normalized === '/team') return 'team';
  if (normalized === '/admin') return 'admin';
  if (/^\/pokedex\/\d+$/.test(normalized)) return 'pokedex-species';
  if (/^\/pokemon\/[^/]+$/.test(normalized)) return 'owned-pokemon';
  return null;
}

export function preloadProductRoute(path: string) {
  const chunk = productRouteChunk(path);
  if (!chunk) return undefined;

  const existing = warmedChunks.get(chunk);
  if (existing) return existing;

  const pending = PRODUCT_ROUTE_LOADERS[chunk]().catch((error: unknown) => {
    warmedChunks.delete(chunk);
    throw error;
  });
  warmedChunks.set(chunk, pending);
  return pending;
}
