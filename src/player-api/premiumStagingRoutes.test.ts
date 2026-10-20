import { describe, expect, it } from 'vitest';
import { resolvePlayerProxyRoute } from '../../api/hub/player/[...path]';
import { resolvePremiumStageAdminRoute, resolvePremiumStagePlayerRoute } from './premiumStagingRoutes';

const playerId = '11111111-1111-4111-8111-111111111111';
const orderId = '22222222-2222-4222-8222-222222222222';
const url = (path: string) => new URL(`https://preview.example.com${path}`);

describe('Premium staging proxy allowlist', () => {
  it('keeps the normal battle route and refuses superseded premium checkout mutations', () => {
    expect(resolvePlayerProxyRoute(url('/api/hub/player/battle'), 'GET')).toMatchObject({
      upstreamPath: '/v1/hub/player/battle', premiumStaging: false,
    });
    expect(resolvePlayerProxyRoute(url('/api/hub/player/battle?noCache=true'), 'GET')).toMatchObject({
      premiumStaging: false,
    });
    expect(resolvePlayerProxyRoute(url('/api/hub/player/premium/orders'), 'POST')).toBeNull();
    expect(resolvePremiumStagePlayerRoute(url('/api/hub/player/premium/orders?admin=true'), 'POST')).toBeNull();
    expect(resolvePlayerProxyRoute(url('/api/hub/player/premium/orders'), 'GET')).toBeNull();
    expect(resolvePlayerProxyRoute(url('/api/hub/player/roster'), 'POST')).toBeNull();
  });

  it('allows historical read and support, but never financial approval or old paid-order delivery', () => {
    expect(resolvePremiumStageAdminRoute(url(`/api/hub/admin/premium?playerId=${playerId}&resource=orders`), 'GET')).toMatchObject({
      upstreamPath: `/v1/hub/admin/premium/players/${playerId}/orders`, allowedMethod: 'GET',
    });
    expect(resolvePremiumStageAdminRoute(url(`/api/hub/admin/premium?playerId=${playerId}&resource=support`), 'POST')).toMatchObject({
      upstreamPath: `/v1/hub/admin/premium/players/${playerId}/support`, allowedMethod: 'POST',
    });
    expect(resolvePremiumStageAdminRoute(url(`/api/hub/admin/premium/orders/${orderId}/approve`), 'POST')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url(`/api/hub/admin/premium/orders/${orderId}/deliver`), 'POST')).toBeNull();
  });

  it('routes owner-delivery catalog, grants and history without payment endpoints', () => {
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/catalog'), 'GET')).toMatchObject({
      upstreamPath: '/v1/hub/admin/premium/delivery/catalog', allowedMethod: 'GET',
    });
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery'), 'POST')).toMatchObject({
      upstreamPath: '/v1/hub/admin/premium/delivery', allowedMethod: 'POST',
    });
    expect(resolvePremiumStageAdminRoute(url(`/api/hub/admin/premium?playerId=${playerId}&resource=deliveries`), 'GET')).toMatchObject({
      upstreamPath: `/v1/hub/admin/premium/players/${playerId}/deliveries`, allowedMethod: 'GET',
    });
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery?paid=1'), 'POST')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery'), 'GET')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/catalog'), 'POST')).toBeNull();
  });

  it('only searches stage trainers by bounded name prefix', () => {
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/players?q=Aurora'), 'GET'))
      .toMatchObject({
        upstreamPath: '/v1/hub/admin/players?q=Aurora&limit=8',
        allowedMethod: 'GET',
      });
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/players?q=A'), 'GET')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/players?q=Aurora&limit=10000'), 'GET')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/players?q=Aurora'), 'POST')).toBeNull();
  });

  it('allowlists standalone item catalog and audited item delivery only on staging', () => {
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/items'), 'GET')).toEqual({
      upstreamPath: '/v1/hub/admin/premium/delivery/items', allowedMethod: 'GET',
    });
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/items'), 'POST')).toEqual({
      upstreamPath: '/v1/hub/admin/premium/delivery/items', allowedMethod: 'POST',
    });
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/items?paid=1'), 'POST')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/items'), 'DELETE')).toBeNull();
  });

  it('allowlists the exact MASTER pack endpoint without payments or arbitrary pack SKUs', () => {
    const endpoint = '/api/hub/admin/premium/delivery/packs/master';
    expect(resolvePremiumStageAdminRoute(url(endpoint), 'GET')).toEqual({
      upstreamPath: '/v1/hub/admin/premium/delivery/packs/master', allowedMethod: 'GET',
    });
    expect(resolvePremiumStageAdminRoute(url(endpoint), 'POST')).toEqual({
      upstreamPath: '/v1/hub/admin/premium/delivery/packs/master', allowedMethod: 'POST',
    });
    for (const [path, method] of [
      [endpoint + '?paid=true', 'POST'],
      [endpoint + '?sku=MASTER', 'GET'],
      [endpoint, 'PUT'],
      [endpoint, 'DELETE'],
      ['/api/hub/admin/premium/delivery/packs/GEN', 'POST'],
      ['/api/hub/admin/premium/delivery/packs/master/payment', 'POST'],
    ] as const) expect(resolvePremiumStageAdminRoute(url(path), method)).toBeNull();
  });

  it('allowlists only individual staged Pokémon delivery and published-form reads', () => {
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/pokemon'), 'GET'))
      .toEqual({
        upstreamPath: '/v1/hub/admin/premium/delivery/pokemon', allowedMethod: 'GET',
      });
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/pokemon'), 'POST'))
      .toEqual({
        upstreamPath: '/v1/hub/admin/premium/delivery/pokemon', allowedMethod: 'POST',
      });
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/pokemon?paid=true'), 'POST'))
      .toBeNull();
    expect(resolvePremiumStageAdminRoute(url('/api/hub/admin/premium/delivery/pokemon'), 'DELETE'))
      .toBeNull();
  });

  it('allowlists human case opening, status transition and immutable timeline only on staged owner', () => {
    const root='/api/hub/admin/premium/delivery/cases';
    const id='11111111-1111-4111-8111-111111111111';
    expect(resolvePremiumStageAdminRoute(url(root+'/catalog'),'GET')).toEqual({
      upstreamPath:'/v1/hub/admin/premium/delivery/cases/catalog',allowedMethod:'GET',
    });
    expect(resolvePremiumStageAdminRoute(url(root),'POST')).toEqual({
      upstreamPath:'/v1/hub/admin/premium/delivery/cases',allowedMethod:'POST',
    });
    expect(resolvePremiumStageAdminRoute(url(root+'?playerId='+id),'GET')).toEqual({
      upstreamPath:'/v1/hub/admin/premium/delivery/cases?playerId='+id,allowedMethod:'GET',
    });
    expect(resolvePremiumStageAdminRoute(url(root+'/'+id+'/transition'),'POST')).toEqual({
      upstreamPath:'/v1/hub/admin/premium/delivery/cases/'+id+'/transition',allowedMethod:'POST',
    });
    expect(resolvePremiumStageAdminRoute(url(root+'/'+id+'/events'),'GET')).toEqual({
      upstreamPath:'/v1/hub/admin/premium/delivery/cases/'+id+'/events',allowedMethod:'GET',
    });
    expect(resolvePremiumStageAdminRoute(url(root+'?paid=1'),'POST')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url(root+'?playerId=bad'),'GET')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url(root+'/'+id+'/transition'),'GET')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url(root+'/'+id+'/events'),'POST')).toBeNull();
    expect(resolvePremiumStageAdminRoute(url(root+'/'+id+'/payment'),'POST')).toBeNull();
  });

  it('refuses unsupported actions, query injection and mutations', () => {
    for (const [path, method] of [
      [`/api/hub/admin/premium?playerId=${playerId}&resource=orders&debug=1`, 'GET'],
      [`/api/hub/admin/premium?playerId=${playerId}&resource=orders`, 'POST'],
      [`/api/hub/admin/premium?playerId=../../&resource=support`, 'POST'],
      [`/api/hub/admin/premium/orders/${orderId}/pay`, 'POST'],
      [`/api/hub/admin/premium/orders/${orderId}/deliver?confirm=1`, 'POST'],
      [`/api/hub/admin/premium/orders/${orderId}/deliver`, 'GET'],
    ] as const) expect(resolvePremiumStageAdminRoute(url(path), method)).toBeNull();
  });
});
