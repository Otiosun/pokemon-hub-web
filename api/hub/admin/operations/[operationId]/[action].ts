import { proxyPlayerPortalRequest } from '../../../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl } from '../../../../../src/player-api/playerPortalServerRuntime.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(['simulate', 'confirm', 'approve', 'apply']);

export function resolveAdminOperationActionPath(
  url: URL,
): `/v1/hub/admin/operations/${string}` | null {
  const match = url.pathname.match(
    /^\/api\/hub\/admin\/operations\/([^/]+)\/([^/]+)\/?$/i,
  );
  const operationId = match?.[1];
  const action = match?.[2]?.toLowerCase();
  if (
    operationId === undefined ||
    action === undefined ||
    !UUID_PATTERN.test(operationId) ||
    !ACTIONS.has(action)
  ) {
    return null;
  }
  return `/v1/hub/admin/operations/${operationId}/${action}`;
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
    const upstreamPath = resolveAdminOperationActionPath(new URL(request.url));
    if (upstreamPath === null) return Promise.resolve(jsonNotFound());

    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath,
      allowedMethod: 'POST',
    });
  },
};
