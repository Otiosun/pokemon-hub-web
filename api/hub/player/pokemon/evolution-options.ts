import { proxyPlayerPortalRequest } from '../../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl } from '../../../../src/player-api/playerPortalServerRuntime.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default {
  fetch(request: Request): Promise<Response> | Response {
    const url = new URL(request.url);
    const id = url.searchParams.get('pokemonInstanceId');
    if (!id || !UUID.test(id)) {
      return Response.json({ error: 'VALIDATION_FAILED' }, { status: 400 });
    }
    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath: `/v1/hub/player/pokemon/evolution-options?pokemonInstanceId=${id}`,
      allowedMethod: 'GET',
    });
  },
};
