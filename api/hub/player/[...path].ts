import { isSafePremiumStagingMutation, premiumStagingForbidden } from '../../../src/player-api/premiumStagingRequestGuard.js';
import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl, readPremiumStagingApiBaseUrl } from '../../../src/player-api/playerPortalServerRuntime.js';
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
    if (route.premiumStaging && request.method === 'POST' && !isSafePremiumStagingMutation(request)) {
      return Promise.resolve(premiumStagingForbidden());
    }

    return proxyPlayerPortalRequest(request, {
      baseUrl: route.premiumStaging ? readPremiumStagingApiBaseUrl() : readPlayerPortalApiBaseUrl(),
      sessionScope: route.premiumStaging ? 'premium-stage' : 'normal',
      upstreamPath: route.upstreamPath,
      allowedMethod: route.allowedMethod,
    });
  },
};
