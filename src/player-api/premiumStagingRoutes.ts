/** Strict, staging-only Premium endpoint allowlist. No arbitrary proxy paths. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_FRAGMENT = '([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})';
export type PremiumStageRoute = {
  upstreamPath: `/v1/hub/${string}`;
  allowedMethod: 'GET' | 'POST';
};

/** Gate F5: cart is manual; no new premium orders are accepted by the Hub proxy. */
export function resolvePremiumStagePlayerRoute(_url: URL, _method: string): PremiumStageRoute | null {
  return null;
}

export function resolvePremiumStageAdminRoute(url: URL, method: string): PremiumStageRoute | null {
  const caseBase = '/api/hub/admin/premium/delivery/cases';
  if (!url.search && url.pathname === caseBase + '/catalog' && method === 'GET')
    return { upstreamPath: '/v1/hub/admin/premium/delivery/cases/catalog', allowedMethod: 'GET' };
  if (url.pathname === caseBase) {
    if (!url.search && method === 'POST')
      return { upstreamPath: '/v1/hub/admin/premium/delivery/cases', allowedMethod: 'POST' };
    if (method === 'GET' && url.searchParams.size === 1) {
      const id = url.searchParams.get('playerId');
      if (id && UUID.test(id))
        return { upstreamPath: `/v1/hub/admin/premium/delivery/cases?playerId=${id}`, allowedMethod: 'GET' };
    }
    return null;
  }
  if (!url.search && url.pathname.startsWith(caseBase + '/')) {
    const suffix=url.pathname.slice(caseBase.length+1);
    const match=new RegExp('^'+UUID_FRAGMENT+'/(transition|events)$','i').exec(suffix);
    const id=match?.[1]; const kind=match?.[2]?.toLowerCase();
    if(id && UUID.test(id) && kind==='events' && method==='GET')
      return {upstreamPath: `/v1/hub/admin/premium/delivery/cases/${id}/events`, allowedMethod:'GET'};
    if(id && UUID.test(id) && kind==='transition' && method==='POST')
      return {upstreamPath: `/v1/hub/admin/premium/delivery/cases/${id}/transition`, allowedMethod:'POST'};
    return null;
  }
  if (url.pathname === '/api/hub/admin/premium/players' && method === 'GET') {
    if (url.searchParams.size !== 1) return null;
    const query = url.searchParams.get('q')?.trim();
    if (!query || query.length < 2 || query.length > 80 || query.split('').some((char) => char.charCodeAt(0) < 32)) return null;
    return {
      upstreamPath: `/v1/hub/admin/players?q=${encodeURIComponent(query)}&limit=8`,
      allowedMethod: 'GET',
    };
  }
  // Commercial MASTER grant is limited to the exact published Master Ball, never a generic pack proxy.
  if (!url.search && url.pathname === '/api/hub/admin/premium/delivery/packs/master' &&
      (method === 'GET' || method === 'POST')) {
    return { upstreamPath: '/v1/hub/admin/premium/delivery/packs/master', allowedMethod: method };
  }
  if (!url.search && url.pathname === '/api/hub/admin/premium/delivery/pokemon' &&
      (method === 'GET' || method === 'POST')) {
    return { upstreamPath: '/v1/hub/admin/premium/delivery/pokemon', allowedMethod: method };
  }
  if (!url.search && url.pathname === '/api/hub/admin/premium/delivery/items' &&
      (method === 'GET' || method === 'POST')) {
    return { upstreamPath: '/v1/hub/admin/premium/delivery/items', allowedMethod: method };
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

  // Old approval and paid-order delivery endpoints belong to a superseded
  // workflow. Keep read-only ledgers, never expose financial mutations.
  return null;
}
