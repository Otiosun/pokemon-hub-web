import {
  isSafePremiumStagingMutation,
  premiumStagingForbidden,
} from '../../../src/player-api/premiumStagingRequestGuard.js';
import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy.js';
import {
  readPlayerPortalApiBaseUrl,
  readPremiumStagingApiBaseUrl,
} from '../../../src/player-api/playerPortalServerRuntime.js';
import { resolvePremiumStagePlayerRoute } from '../../../src/player-api/premiumStagingRoutes.js';

type PlayerProxyRoute = {
  upstreamPath: `/v1/hub/${string}`;
  allowedMethod: 'GET' | 'POST';
  premiumStaging: boolean;
};

/** Reuse the existing battle proxy function slot; no extra Vercel Function. */
export function resolvePlayerProxyRoute(url: URL, method: string): PlayerProxyRoute | null {
  if (url.pathname === '/api/hub/player/battle' && method === 'GET') {
    return { upstreamPath: '/v1/hub/player/battle', allowedMethod: 'GET', premiumStaging: false };
  }
  // Exact Stage2 evolution routes share this existing function slot so Hobby
  // preview stays within 12 functions. Revalidate method and UUID here;
  // the backend still authenticates the player and owns evolution rules.
  if (url.pathname === '/api/hub/player/pokemon/evolution-options' && method === 'GET') {
    const id = url.searchParams.get('pokemonInstanceId');
    const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (id === null || !validId.test(id) || [...url.searchParams.keys()].some(k=>k !== 'pokemonInstanceId') ||
        url.searchParams.getAll('pokemonInstanceId').length !== 1) return null;
    return {
      upstreamPath: `/v1/hub/player/pokemon/evolution-options?pokemonInstanceId=${encodeURIComponent(id)}`,
      allowedMethod: 'GET',
      premiumStaging: false,
    };
  }
  if (url.pathname === '/api/hub/player/pokemon/evolve' && method === 'POST' && !url.search) {
    return { upstreamPath: '/v1/hub/player/pokemon/evolve', allowedMethod: 'POST', premiumStaging: false };
  }
  // Session-bound entitlements: never accept a playerId or mutation from the browser.
  if (url.pathname === '/api/hub/player/benefits' && method === 'GET' && !url.search) {
    return { upstreamPath: '/v1/hub/player/benefits', allowedMethod: 'GET', premiumStaging: false };
  }
  const stage = resolvePremiumStagePlayerRoute(url, method);
  return stage ? { ...stage, premiumStaging: true } : null;
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
  fetch(request: Request): Promise<Response> {
    const route = resolvePlayerProxyRoute(new URL(request.url), request.method);
    if (route === null) return Promise.resolve(jsonNotFound());
    if (
      request.method === 'POST' &&
      (route.premiumStaging || new URL(request.url).pathname === '/api/hub/player/pokemon/evolve') &&
      !isSafePremiumStagingMutation(request)
    ) {
      if (route.premiumStaging) return Promise.resolve(premiumStagingForbidden());
      return Promise.resolve(new Response(
        JSON.stringify({ error: 'CROSS_ORIGIN_PLAYER_MUTATION' }),
        { status: 403, headers: { 'cache-control': 'no-store', 'content-type': 'application/json' } },
      ));
    }

    return proxyPlayerPortalRequest(request, {
      baseUrl: route.premiumStaging ? readPremiumStagingApiBaseUrl() : readPlayerPortalApiBaseUrl(),
      sessionScope: route.premiumStaging ? 'premium-stage' : 'normal',
      upstreamPath: route.upstreamPath,
      allowedMethod: route.allowedMethod,
    });
  },
};
