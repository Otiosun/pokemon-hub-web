import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl } from '../../../src/player-api/playerPortalServerRuntime.js';

export default {
  fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      upstreamPath: `/v1/hub/admin/players${url.search}`,
      allowedMethod: 'GET',
    });
  },
};
