import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl } from '../../../src/player-api/playerPortalServerRuntime.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');
    if (request.method !== 'POST' || playerId === null || !UUID_PATTERN.test(playerId)) {
      return Promise.resolve(jsonNotFound());
    }

    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath: `/v1/hub/admin/players/${playerId}/whatsapp-identity`,
      allowedMethod: 'POST',
    });
  },
};
