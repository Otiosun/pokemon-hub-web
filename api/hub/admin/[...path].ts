import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl } from '../../../src/player-api/playerPortalServerRuntime.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminProxyRoute = {
  upstreamPath: `/v1/hub/${string}`;
  allowedMethod: 'GET' | 'POST' | 'PUT';
};

export function resolveAdminProxyRoute(url: URL): AdminProxyRoute | null {
  if (url.pathname === '/api/hub/admin/self') {
    return {
      upstreamPath: '/v1/hub/admin/self',
      allowedMethod: 'GET',
    };
  }

  if (url.pathname === '/api/hub/admin/players') {
    return {
      upstreamPath: `/v1/hub/admin/players${url.search}`,
      allowedMethod: 'GET',
    };
  }

  const playerMatch = url.pathname.match(
    /^\/api\/hub\/admin\/players\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  );
  const playerId = playerMatch?.[1];
  if (playerId !== undefined && UUID_PATTERN.test(playerId)) {
    return {
      upstreamPath: `/v1/hub/admin/players/${playerId}`,
      allowedMethod: 'GET',
    };
  }

  const adjustmentMatch = url.pathname.match(
    /^\/api\/hub\/admin\/players\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/adjustments$/i,
  );
  const adjustmentPlayerId = adjustmentMatch?.[1];
  if (adjustmentPlayerId !== undefined && UUID_PATTERN.test(adjustmentPlayerId)) {
    return {
      upstreamPath: `/v1/hub/admin/players/${adjustmentPlayerId}/adjustments`,
      allowedMethod: 'POST',
    };
  }

  return null;
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
    const route = resolveAdminProxyRoute(new URL(request.url));
    if (route === null) return Promise.resolve(jsonNotFound());

    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath: route.upstreamPath,
      allowedMethod: route.allowedMethod,
    });
  },
};
