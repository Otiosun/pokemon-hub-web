import { proxyPlayerPortalRequest } from '../../../src/player-api/playerPortalProxy.js';
import { readPlayerPortalApiBaseUrl } from '../../../src/player-api/playerPortalServerRuntime.js';

type PlayerProxyRoute = {
  upstreamPath: `/v1/hub/${string}`;
  allowedMethod: 'GET' | 'POST';
};

/** The Vercel Hobby deployment has a tight function budget. Reuse one
 * strictly allowlisted Player proxy instead of adding another Function.
 * Unknown or gameplay mutation routes NEVER pass through.
 */
export function resolvePlayerProxyRoute(url: URL, method: string): PlayerProxyRoute | null {
  if (url.pathname === '/api/hub/player/battle' && method === 'GET') {
    return { upstreamPath: '/v1/hub/player/battle', allowedMethod: 'GET' };
  }
  if (url.pathname === '/api/hub/player/premium/orders' && method === 'POST') {
    return { upstreamPath: '/v1/hub/player/premium/orders', allowedMethod: 'POST' };
  }
  return null;
}

export default {
  fetch(request: Request): Promise<Response> {
    const route = resolvePlayerProxyRoute(new URL(request.url), request.method);
    if (!route) {
      return Promise.resolve(new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
        status: 404,
        headers: {
          'cache-control': 'no-store',
          'content-type': 'application/json; charset=utf-8',
        },
      }));
    }
    return proxyPlayerPortalRequest(request, {
      baseUrl: readPlayerPortalApiBaseUrl(),
      ...route,
    });
  },
};
