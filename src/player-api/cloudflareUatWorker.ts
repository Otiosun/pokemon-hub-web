import type { PlayerPortalFetcher } from './playerPortalClient';
import { proxyPlayerPortalRequest } from './playerPortalProxy';

const LEGACY_UAT_HOST = 'feat-player-api-v1-pokemon-hub-web.natanaelgames19.workers.dev';
const PREVIEW_HOST_SUFFIX = '-pokemon-hub-web.natanaelgames19.workers.dev';
const LEGACY_PLAYER_API_URL = 'https://stadium-mathematics-disks-honolulu.trycloudflare.com';
const PLAYER_PORTAL_API_URL = 'https://pokemon-api.otiosunbots.xyz';

type CloudflareUatAssets = {
  fetch(request: Request): Promise<Response>;
};

type CloudflareUatEnv = {
  ASSETS: CloudflareUatAssets;
};

type HubUatRoute = {
  upstreamPath: `/v1/hub/${string}`;
  allowedMethod: 'GET' | 'POST' | 'PUT';
};

const LEGACY_HUB_UAT_ROUTES: Readonly<Record<string, HubUatRoute>> = {
  '/api/hub/auth/exchange': {
    upstreamPath: '/v1/hub/auth/exchange',
    allowedMethod: 'POST',
  },
  '/api/hub/player/self': {
    upstreamPath: '/v1/hub/player/self',
    allowedMethod: 'GET',
  },
  '/api/hub/player/pokemon': {
    upstreamPath: '/v1/hub/player/pokemon',
    allowedMethod: 'GET',
  },
  '/api/hub/player/pokedex': {
    upstreamPath: '/v1/hub/player/pokedex',
    allowedMethod: 'GET',
  },
  '/api/hub/player/location': {
    upstreamPath: '/v1/hub/player/location',
    allowedMethod: 'GET',
  },
  '/api/hub/player/roster': {
    upstreamPath: '/v1/hub/player/roster',
    allowedMethod: 'PUT',
  },
  '/api/hub/player/profile-customization': {
    upstreamPath: '/v1/hub/player/profile-customization',
    allowedMethod: 'PUT',
  },
};

const PREVIEW_HUB_ROUTES: Readonly<Record<string, HubUatRoute>> = {
  '/api/hub/auth/exchange': {
    upstreamPath: '/v1/hub/auth/exchange',
    allowedMethod: 'POST',
  },
  '/api/hub/player/self': {
    upstreamPath: '/v1/hub/player/self',
    allowedMethod: 'GET',
  },
  '/api/hub/player/pokemon': {
    upstreamPath: '/v1/hub/player/pokemon',
    allowedMethod: 'GET',
  },
  '/api/hub/player/pokedex': {
    upstreamPath: '/v1/hub/player/pokedex',
    allowedMethod: 'GET',
  },
  '/api/hub/player/inventory': {
    upstreamPath: '/v1/hub/player/inventory',
    allowedMethod: 'GET',
  },
  '/api/hub/player/battle': {
    upstreamPath: '/v1/hub/player/battle',
    allowedMethod: 'GET',
  },
  '/api/hub/player/move-choices': {
    upstreamPath: '/v1/hub/player/move-choices',
    allowedMethod: 'GET',
  },
  '/api/hub/player/move-choices/resolve': {
    upstreamPath: '/v1/hub/player/move-choices/resolve',
    allowedMethod: 'POST',
  },
  '/api/hub/player/location': {
    upstreamPath: '/v1/hub/world/location',
    allowedMethod: 'GET',
  },
  '/api/hub/player/roster': {
    upstreamPath: '/v1/hub/player/roster',
    allowedMethod: 'PUT',
  },
  '/api/hub/player/profile-customization': {
    upstreamPath: '/v1/hub/player/profile-customization',
    allowedMethod: 'PUT',
  },
};

function isPreviewHost(hostname: string): boolean {
  return hostname !== LEGACY_UAT_HOST && hostname.endsWith(PREVIEW_HOST_SUFFIX);
}

export async function handleCloudflareUatRequest(
  request: Request,
  env: CloudflareUatEnv,
  upstreamFetcher: PlayerPortalFetcher = fetch,
): Promise<Response> {
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/api/hub/')) {
    return env.ASSETS.fetch(request);
  }

  const legacyRequest = url.hostname === LEGACY_UAT_HOST;
  const previewRequest = isPreviewHost(url.hostname);

  if (!legacyRequest && !previewRequest) {
    return jsonNotFound();
  }

  const routes = legacyRequest ? LEGACY_HUB_UAT_ROUTES : PREVIEW_HUB_ROUTES;
  const route = routes[url.pathname];
  if (route === undefined) {
    return jsonNotFound();
  }

  return proxyPlayerPortalRequest(request, {
    baseUrl: legacyRequest ? LEGACY_PLAYER_API_URL : PLAYER_PORTAL_API_URL,
    upstreamPath: route.upstreamPath,
    allowedMethod: route.allowedMethod,
    fetcher: upstreamFetcher,
  });
}

function jsonNotFound(): Response {
  return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
    status: 404,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

export default {
  fetch(request: Request, env: CloudflareUatEnv): Promise<Response> {
    return handleCloudflareUatRequest(request, env);
  },
};
