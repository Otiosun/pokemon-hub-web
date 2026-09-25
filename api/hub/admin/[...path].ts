import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl } from '../../../src/player-api/playerPortalServerRuntime.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminProxyRoute = {
  upstreamPath: `/v1/hub/${string}`;
  allowedMethod: 'GET' | 'POST' | 'PUT';
};

export function resolveAdminProxyRoute(url: URL, requestMethod = 'GET'): AdminProxyRoute | null {
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

  if (url.pathname === '/api/hub/admin/reward-catalog') {
    return {
      upstreamPath: '/v1/hub/admin/reward-catalog',
      allowedMethod: 'GET',
    };
  }

  if (url.pathname === '/api/hub/admin/team') {
    return {
      upstreamPath: '/v1/hub/admin/team',
      allowedMethod: 'GET',
    };
  }

  const teamCapabilityMatch = url.pathname.match(
    /^\/api\/hub\/admin\/team\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/capabilities$/i,
  );
  const teamPrincipalId = teamCapabilityMatch?.[1];
  if (teamPrincipalId !== undefined && UUID_PATTERN.test(teamPrincipalId)) {
    return {
      upstreamPath: `/v1/hub/admin/team/${teamPrincipalId}/capabilities`,
      allowedMethod: 'PUT',
    };
  }

  if (
    url.pathname === '/api/hub/admin/operations' &&
    (requestMethod === 'GET' || requestMethod === 'POST')
  ) {
    return {
      upstreamPath: '/v1/hub/admin/operations',
      allowedMethod: requestMethod,
    };
  }

  const operationActionMatch = url.pathname.match(
    /^\/api\/hub\/admin\/operations\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/(simulate|confirm|approve|apply)$/i,
  );
  const operationId = operationActionMatch?.[1];
  const operationAction = operationActionMatch?.[2]?.toLowerCase();
  if (
    operationId !== undefined &&
    UUID_PATTERN.test(operationId) &&
    (operationAction === 'simulate' ||
      operationAction === 'confirm' ||
      operationAction === 'approve' ||
      operationAction === 'apply')
  ) {
    return {
      upstreamPath: `/v1/hub/admin/operations/${operationId}/${operationAction}`,
      allowedMethod: 'POST',
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
    const route = resolveAdminProxyRoute(new URL(request.url), request.method);
    if (route === null) return Promise.resolve(jsonNotFound());

    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath: route.upstreamPath,
      allowedMethod: route.allowedMethod,
    });
  },
};
