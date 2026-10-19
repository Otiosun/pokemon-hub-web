/** Strict, staging-only Premium endpoint allowlist. No arbitrary proxy paths. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_FRAGMENT = '([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})';
const ACTION = new RegExp(`^/api/hub/admin/premium/orders/${UUID_FRAGMENT}/(approve|deliver)$`, 'i');

export type PremiumStageRoute = {
  upstreamPath: `/v1/hub/${string}`;
  allowedMethod: 'GET' | 'POST';
};

export function resolvePremiumStagePlayerRoute(url: URL, method: string): PremiumStageRoute | null {
  return url.pathname === '/api/hub/player/premium/orders' && !url.search &&
    method === 'POST'
    ? { upstreamPath: '/v1/hub/player/premium/orders', allowedMethod: 'POST' }
    : null;
}

export function resolvePremiumStageAdminRoute(url: URL, method: string): PremiumStageRoute | null {
  if (url.pathname === '/api/hub/admin/premium/players' && method === 'GET') {
    if (url.searchParams.size !== 1) return null;
    const query = url.searchParams.get('q')?.trim();
    if (!query || query.length < 2 || query.length > 80 || query.split('').some((char) => char.charCodeAt(0) < 32)) return null;
    return {
      upstreamPath: `/v1/hub/admin/players?q=${encodeURIComponent(query)}&limit=8`,
      allowedMethod: 'GET',
    };
  }
  if (!url.search && url.pathname === '/api/hub/admin/premium/delivery/catalog' && method === 'GET') {
    return { upstreamPath: '/v1/hub/admin/premium/delivery/catalog', allowedMethod: 'GET' };
  }
  if (!url.search && url.pathname === '/api/hub/admin/premium/delivery' && method === 'POST') {
    return { upstreamPath: '/v1/hub/admin/premium/delivery', allowedMethod: 'POST' };
  }
  if (url.pathname === '/api/hub/admin/premium') {
    if (url.searchParams.size !== 2) return null;
    const playerId = url.searchParams.get('playerId');
    const resource = url.searchParams.get('resource');
    if (!playerId || !UUID.test(playerId) || !resource) return null;
    if (resource === 'support' && (method === 'GET' || method === 'POST')) {
      return {
        upstreamPath: `/v1/hub/admin/premium/players/${playerId}/support`,
        allowedMethod: method,
      };
    }
    if (resource === 'deliveries' && method === 'GET') {
      return {
        upstreamPath: `/v1/hub/admin/premium/players/${playerId}/deliveries`,
        allowedMethod: 'GET',
      };
    }
    if ((resource === 'orders' || resource === 'entitlements') && method === 'GET') {
      return {
        upstreamPath: `/v1/hub/admin/premium/players/${playerId}/${resource}`,
        allowedMethod: 'GET',
      };
    }
    return null;
  }

  if (url.search || method !== 'POST') return null;
  const match = ACTION.exec(url.pathname);
  const orderId = match?.[1];
  const action = match?.[2]?.toLowerCase();
  if (!orderId || !UUID.test(orderId) || (action !== 'approve' && action !== 'deliver')) return null;
  return {
    upstreamPath: `/v1/hub/admin/premium/orders/${orderId}/${action}`,
    allowedMethod: 'POST',
  };
}
