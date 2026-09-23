import { proxyPlayerPortalRequest } from '../../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl } from '../../../../src/player-api/playerPortalServerRuntime.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

export default {
  fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const playerId = url.pathname.split('/').filter(Boolean).at(-1) ?? '';
    if (!UUID_PATTERN.test(playerId)) {
      return Promise.resolve(jsonError(400, 'VALIDATION_FAILED'));
    }

    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath: `/v1/hub/admin/players/${playerId}`,
      allowedMethod: 'GET',
    });
  },
};
