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
    const rewrittenPlayerId = url.searchParams.get('playerId');
    const rewrittenAction = url.searchParams.get('action')?.toLowerCase();

    if (rewrittenPlayerId !== null || rewrittenAction !== undefined) {
      if (rewrittenPlayerId === null || !UUID_PATTERN.test(rewrittenPlayerId)) {
        return null;
      }

      if (rewrittenAction === undefined && requestMethod === 'GET') {
        return {
          upstreamPath: `/v1/hub/admin/players/${rewrittenPlayerId}`,
          allowedMethod: 'GET',
        };
      }

      if (rewrittenAction === 'adjustments' && requestMethod === 'POST') {
        return {
          upstreamPath: `/v1/hub/admin/players/${rewrittenPlayerId}/adjustments`,
          allowedMethod: 'POST',
        };
      }

      return null;
    }

    if (requestMethod !== 'GET') return null;
    return {
      upstreamPath: `/v1/hub/admin/players${url.search}`,
      allowedMethod: 'GET',
    };
  }

  if (url.pathname === '/api/hub/admin/player-identity' && requestMethod === 'POST') {
    const playerId = url.searchParams.get('playerId');
    if (playerId === null || !UUID_PATTERN.test(playerId)) return null;
    return {
      upstreamPath: `/v1/hub/admin/players/${playerId}/whatsapp-identity`,
      allowedMethod: 'POST',
    };
  }

  if (url.pathname === '/api/hub/admin/reward-catalog') {
    return {
      upstreamPath: '/v1/hub/admin/reward-catalog',
      allowedMethod: 'GET',
    };
  }

  if (url.pathname === '/api/hub/admin/audit' && requestMethod === 'GET') {
    return {
      upstreamPath: `/v1/hub/admin/audit${url.search}`,
      allowedMethod: 'GET',
    };
  }

  if (url.pathname === '/api/hub/admin/team') {
    const rewrittenPrincipalId = url.searchParams.get('principalId');
    const rewrittenAction = url.searchParams.get('action')?.toLowerCase();

    if (rewrittenPrincipalId !== null || rewrittenAction !== undefined) {
      if (rewrittenPrincipalId === null || !UUID_PATTERN.test(rewrittenPrincipalId)) {
        return null;
      }
      if (rewrittenAction === 'capabilities' && requestMethod === 'PUT') {
        return {
          upstreamPath: `/v1/hub/admin/team/${rewrittenPrincipalId}/capabilities`,
          allowedMethod: 'PUT',
        };
      }
      if (rewrittenAction === 'reception-staff' && requestMethod === 'PUT') {
        return {
          upstreamPath: `/v1/hub/admin/team/${rewrittenPrincipalId}/reception-staff`,
          allowedMethod: 'PUT',
        };
      }
      return null;
    }

    if (requestMethod === 'GET' || requestMethod === 'POST') {
      return {
        upstreamPath: '/v1/hub/admin/team',
        allowedMethod: requestMethod,
      };
    }
    return null;
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

  if (url.pathname === '/api/hub/admin/operations' && requestMethod === 'POST') {
    const rewrittenOperationId = url.searchParams.get('operationId');
    const rewrittenOperationAction = url.searchParams.get('action')?.toLowerCase();
    if (rewrittenOperationId !== null || rewrittenOperationAction !== undefined) {
      if (
        rewrittenOperationId === null ||
        !UUID_PATTERN.test(rewrittenOperationId) ||
        (rewrittenOperationAction !== 'simulate' &&
          rewrittenOperationAction !== 'confirm' &&
          rewrittenOperationAction !== 'approve' &&
          rewrittenOperationAction !== 'apply')
      ) {
        return null;
      }
      return {
        upstreamPath: `/v1/hub/admin/operations/${rewrittenOperationId}/${rewrittenOperationAction}`,
        allowedMethod: 'POST',
      };
    }
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
