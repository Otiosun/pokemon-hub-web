import { describe, expect, it } from 'vitest';
import { resolvePlayerProxyRoute } from '../../api/hub/player/[...path]';
import { resolvePremiumStageAdminRoute, resolvePremiumStagePlayerRoute } from './premiumStagingRoutes';

const playerId = '11111111-1111-4111-8111-111111111111';
const orderId = '22222222-2222-4222-8222-222222222222';
const url = (path: string) => new URL(`https://preview.example.com${path}`);

describe('Premium staging proxy allowlist', () => {
  it('keeps existing battle route and only accepts the specific checkout route', () => {
    expect(resolvePlayerProxyRoute(url('/api/hub/player/battle'), 'GET')).toMatchObject({
      upstreamPath: '/v1/hub/player/battle', premiumStaging: false,
    });
    expect(resolvePlayerProxyRoute(url('/api/hub/player/battle?noCache=true'), 'GET')).toMatchObject({
      premiumStaging: false,
    });
    expect(resolvePlayerProxyRoute(url('/api/hub/player/premium/orders'), 'POST')).toMatchObject({
      upstreamPath: '/v1/hub/player/premium/orders', premiumStaging: true,
    });
    expect(resolvePremiumStagePlayerRoute(url('/api/hub/player/premium/orders?admin=true'), 'POST')).toBeNull();
    expect(resolvePlayerProxyRoute(url('/api/hub/player/premium/orders'), 'GET')).toBeNull();
    expect(resolvePlayerProxyRoute(url('/api/hub/player/roster'), 'POST')).toBeNull();
  });

  it('allows only read/support actions and owner approval/delivery routes', () => {
    expect(resolvePremiumStageAdminRoute(url(`/api/hub/admin/premium?playerId=${playerId}&resource=orders`), 'GET')).toMatchObject({
      upstreamPath: `/v1/hub/admin/premium/players/${playerId}/orders`, allowedMethod: 'GET',
    });
    expect(resolvePremiumStageAdminRoute(url(`/api/hub/admin/premium?playerId=${playerId}&resource=support`), 'POST')).toMatchObject({
      upstreamPath: `/v1/hub/admin/premium/players/${playerId}/support`, allowedMethod: 'POST',
    });
    expect(resolvePremiumStageAdminRoute(url(`/api/hub/admin/premium/orders/${orderId}/approve`), 'POST')).toMatchObject({
      upstreamPath: `/v1/hub/admin/premium/orders/${orderId}/approve`,
    });
    expect(resolvePremiumStageAdminRoute(url(`/api/hub/admin/premium/orders/${orderId}/deliver`), 'POST')).toMatchObject({
      upstreamPath: `/v1/hub/admin/premium/orders/${orderId}/deliver`,
    });
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
