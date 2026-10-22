import { resolveProductRoute } from './productIntegrity';

export type ProductRouteChunk =
  | 'journey'
  | 'inventory'
  | 'benefits'
  | 'pokedex-index'
  | 'pokedex-species'
  | 'box'
  | 'owned-pokemon'
  | 'team'
  | 'systems'
  | 'admin'
  | 'admin-players'
  | 'admin-player'
  | 'admin-rewards'
  | 'admin-team'
  | 'admin-content'
  | 'admin-audit'
  | 'admin-guide';

const PRODUCT_ROUTE_LOADERS: Record<ProductRouteChunk, () => Promise<unknown>> = {
  journey: () => import('../features/journey/JourneyPage'),
  inventory: () => import('../features/inventory/InventoryPage'),
  benefits: () => import('../features/benefits/BenefitsPage'),
  'pokedex-index': () => import('../features/pokedex/PokedexIndexPage'),
  'pokedex-species': () => import('../features/pokedex/PokedexSpeciesPage'),
  box: () => import('../features/collection/OwnedPokemonCollectionPage'),
  'owned-pokemon': () => import('../features/collection/OwnedPokemonDetailPage'),
  team: () => import('../features/team/TeamPage'),
  systems: () => import('../features/systems/SystemsPage'),
  admin: () => import('../features/admin/AdminPage'),
  'admin-players': () => import('../features/admin/AdminPlayersPage'),
  'admin-player': () => import('../features/admin/AdminPlayerDetailPage'),
  'admin-rewards': () => import('../features/admin/AdminBatchRewardsPage'),
  'admin-team': () => import('../features/admin/AdminTeamPage'),
  'admin-content': () => import('../features/admin/AdminContentPage'),
  'admin-audit': () => import('../features/admin/AdminAuditPage'),
  'admin-guide': () => import('../features/admin/AdminGuidePage'),
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
  if (normalized === '/jornada/beneficios') return 'benefits';
  if (normalized === '/pokedex') return 'pokedex-index';
  if (normalized === '/pokemon') return 'box';
  if (normalized === '/team') return 'team';
  if (normalized === '/sistemas' || normalized.startsWith('/sistemas/')) return 'systems';
  if (normalized === '/admin') return 'admin';
  if (normalized === '/admin/players') return 'admin-players';
  if (normalized === '/admin/rewards') return 'admin-rewards';
  if (normalized === '/admin/team') return 'admin-team';
  if (normalized === '/admin/content') return 'admin-content';
  if (normalized === '/admin/audit') return 'admin-audit';
  if (normalized === '/admin/guia') return 'admin-guide';
  if (/^\/admin\/players\/[^/]+$/.test(normalized)) return 'admin-player';
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
