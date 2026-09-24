import type { PlayerPortalFetcher } from './playerPortalClient';
import { proxyPlayerPortalRequest } from './playerPortalProxy';

const UAT_HOST = 'feat-player-api-v1-pokemon-hub-web.natanaelgames19.workers.dev';
const STAGING_PLAYER_API_URL = 'https://pokemon-api.otiosunbots.xyz';

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

const HUB_UAT_ROUTES: Readonly<Record<string, HubUatRoute>> = {
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

export async function handleCloudflareUatRequest(
  request: Request,
  env: CloudflareUatEnv,
  upstreamFetcher: PlayerPortalFetcher = fetch,
): Promise<Response> {
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/api/hub/')) {
    return env.ASSETS.fetch(request);
  }

  if (url.hostname !== UAT_HOST) {
    return jsonNotFound();
  }

  const route = HUB_UAT_ROUTES[url.pathname];
  if (route === undefined) {
    return jsonNotFound();
  }

  return proxyPlayerPortalRequest(request, {
    baseUrl: STAGING_PLAYER_API_URL,
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
