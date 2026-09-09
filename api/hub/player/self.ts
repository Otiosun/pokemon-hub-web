import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy';
import { readPlayerPortalApiBaseUrl } from '../../../src/player-api/playerPortalServerRuntime';

export default {
  fetch(request: Request): Promise<Response> {
    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath: '/v1/hub/player/self',
      allowedMethod: 'GET',
    });
  },
};
