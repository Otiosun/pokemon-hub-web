import { isSafePremiumStagingMutation, premiumStagingForbidden } from '../../../src/player-api/premiumStagingRequestGuard.js';
import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl, readPremiumManualApiBaseUrl } from '../../../src/player-api/playerPortalServerRuntime.js';
import { resolvePremiumStageAdminRoute } from '../../../src/player-api/premiumStagingRoutes.js';
import { clearPremiumStageCookie } from '../../../src/player-api/premiumStagingSessionCookies.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Vercel Hobby limits this project to 12 functions. Nested Premium URLs are
// explicitly rewritten to the existing /api/hub/admin/premium function.
// Resolve only fixed, audited route keys; never accept a free-form URL target.
const PREMIUM_REWRITE_PATHS: Readonly<Record<string, string>> = {
  'auth-self': '/api/hub/admin/premium-auth/self',
  'auth-player': '/api/hub/admin/premium-auth/player',
  'auth-exchange': '/api/hub/admin/premium-auth/exchange',
  'auth-logout': '/api/hub/admin/premium-auth/logout',
  'delivery': '/api/hub/admin/premium/delivery',
  'players': '/api/hub/admin/premium/players',
  'catalog': '/api/hub/admin/premium/delivery/catalog',
  'items': '/api/hub/admin/premium/delivery/items',
  'pokemon': '/api/hub/admin/premium/delivery/pokemon',
  'cases': '/api/hub/admin/premium/delivery/cases',
  'cases-catalog': '/api/hub/admin/premium/delivery/cases/catalog',
  'master': '/api/hub/admin/premium/delivery/packs/master',
};

function resolvePremiumRewrite(input: URL): URL | null {
  // Vercel share/automation protection may pass its validated bypass query
  // through to the function. Treat those fields solely as edge transport
  // metadata: never forward them to the game API or interpret them as Hub auth.
  // Keep this exception scoped to Premium URLs or the audited rewrite entrypoint.
  const isPremiumEntry =
    input.pathname.startsWith('/api/hub/admin/premium') ||
    (input.pathname === '/api/hub/admin/self' && input.searchParams.has('premiumRoute'));
  const query = new URLSearchParams(input.searchParams);
  if (isPremiumEntry) {
    for (const name of [
      '__vercel_protection_bypass',
      'x-vercel-protection-bypass',
      'x-vercel-set-bypass-cookie',
    ]) {
      const values = query.getAll(name);
      if (values.length > 1 || (values.length === 1 &&
        (!values[0] || values[0].length > 2048))) return null;
      query.delete(name);
    }
  }
  const normalized = new URL(input);
  normalized.search = query.toString();
  input = normalized;

  const keys = input.searchParams.getAll('premiumRoute');
  if (keys.length === 0) {
    // Vercel's catch-all function can append its capture in the query even
    // when the rewrite marker is not present in Request.url. For an already
    // canonical Premium URL, remove ONLY a capture matching that URL.
    // Other query parameters remain untouched for strict route validation.
    if (!input.pathname.startsWith('/api/hub/admin/premium')) return input;
    const clean = new URL(input);
    const expectedCapture = input.pathname.slice('/api/hub/admin/'.length);
    for (const capture of ['...path', 'path']) {
      const values = clean.searchParams.getAll(capture);
      if (values.length === 0) continue;
      if (
        values.length !== 1 ||
        (values[0] !== expectedCapture && values[0] !== 'self')
      ) return null;
      clean.searchParams.delete(capture);
    }
    return clean;
  }
  if (keys.length !== 1) return null;
  const key = keys[0];
  const params = new URLSearchParams(input.searchParams);
  params.delete('premiumRoute');
  let pathname: string | undefined = key ? PREMIUM_REWRITE_PATHS[key] : undefined;
  if (key === 'case-events' || key === 'case-transition') {
    const ids = params.getAll('premiumCase');
    if (ids.length !== 1 || !ids[0] || !UUID_PATTERN.test(ids[0])) return null;
    pathname = '/api/hub/admin/premium/delivery/cases/' + ids[0] +
      (key === 'case-events' ? '/events' : '/transition');
    params.delete('premiumCase');
  } else if (params.has('premiumCase')) return null;
  if (!pathname) return null;

  // A Vercel rewrite may preserve the SOURCE pathname in Request.url while
  // appending the destination query. It may instead expose the destination
  // pathname. Bind the marker to exactly one known Premium route in both cases.
  if (input.pathname !== '/api/hub/admin/self' && input.pathname !== pathname) return null;

  // The single-segment Vercel [...path] function may append its route capture
  // to URL.search. Accept only the exact entrypoint/canonical route capture,
  // never arbitrary or repeated user-controlled query values.
  const routeCapture = pathname.slice('/api/hub/admin/'.length);
  for (const capture of ['...path', 'path']) {
    const values = params.getAll(capture);
    if (values.length === 0) continue;
    if (values.length !== 1 || (values[0] !== 'self' && values[0] !== routeCapture)) return null;
    params.delete(capture);
  }

  const output = new URL(pathname, input.origin);
  output.search = params.toString();
  return output;
}

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

function jsonNotFound(reason = 'unmatched'): Response {
  return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
    status: 404,
    headers: {
      'x-beyond-route-state': reason,
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

export default {
  fetch(request: Request): Promise<Response> {
    const url = resolvePremiumRewrite(new URL(request.url));
    if (url === null) return Promise.resolve(jsonNotFound('invalid-rewrite'));
    if (url.pathname.startsWith('/api/hub/admin/premium-auth/')) {
      if (request.method === 'POST' && !isSafePremiumStagingMutation(request)) {
        return Promise.resolve(premiumStagingForbidden());
      }
      if (url.search) return Promise.resolve(jsonNotFound('auth-query'));
      if (url.pathname === '/api/hub/admin/premium-auth/logout' && request.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ signedOut: true }), {
          status: 200,
          headers: {
            'cache-control': 'no-store',
            'content-type': 'application/json',
            'set-cookie': clearPremiumStageCookie(),
          },
        }));
      }
      if (url.pathname === '/api/hub/admin/premium-auth/exchange' && request.method === 'POST') {
        return (async () => {
          const input: unknown = await request.clone().json().catch(() => null);
          if (typeof input !== 'object' || input === null || Array.isArray(input) ||
            Object.keys(input).length !== 1 || !('ticket' in input) ||
            typeof input.ticket !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(input.ticket)) {
            return new Response(JSON.stringify({ error: 'VALIDATION_FAILED' }), {
              status: 400, headers: { 'cache-control': 'no-store', 'content-type': 'application/json' },
            });
          }
          return proxyPlayerPortalRequest(request, {
            baseUrl: readPremiumManualApiBaseUrl(),
            upstreamPath: '/v1/hub/auth/exchange',
            allowedMethod: 'POST',
            sessionScope: 'none',
            responseCookieMode: 'premium-stage-exchange',
          });
        })();
      }
      if (url.pathname === '/api/hub/admin/premium-auth/self' && request.method === 'GET') {
        return proxyPlayerPortalRequest(request, {
          baseUrl: readPremiumManualApiBaseUrl(),
          upstreamPath: '/v1/hub/admin/self',
          allowedMethod: 'GET',
          sessionScope: 'premium-stage',
        });
      }
      if (url.pathname === '/api/hub/admin/premium-auth/player' && request.method === 'GET') {
        return proxyPlayerPortalRequest(request, {
          baseUrl: readPremiumManualApiBaseUrl(),
          upstreamPath: '/v1/hub/player/self',
          allowedMethod: 'GET',
          sessionScope: 'premium-stage',
        });
      }
      return Promise.resolve(jsonNotFound('auth-route'));
    }
    if (url.pathname.startsWith('/api/hub/admin/premium')) {
      if (request.method === 'POST' && !isSafePremiumStagingMutation(request)) {
        return Promise.resolve(premiumStagingForbidden());
      }
      const premiumRoute = resolvePremiumStageAdminRoute(url, request.method);
      if (premiumRoute === null) return Promise.resolve(jsonNotFound('premium-route'));
      // Premium never receives the standard Hub/prod browser session.
      return proxyPlayerPortalRequest(request, {
        baseUrl: readPremiumManualApiBaseUrl(),
        sessionScope: 'premium-stage',
        ...premiumRoute,
      });
    }

    const route = resolveAdminProxyRoute(url, request.method);
    if (route === null) return Promise.resolve(jsonNotFound());

    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath: route.upstreamPath,
      allowedMethod: route.allowedMethod,
    });
  },
};
