import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl } from '../../../src/player-api/playerPortalServerRuntime.js';

export default {
  fetch(request: Request): Promise<Response> {
    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath: '/v1/hub/player/profile-customization',
      allowedMethod: 'PUT',
    });
  },
};
