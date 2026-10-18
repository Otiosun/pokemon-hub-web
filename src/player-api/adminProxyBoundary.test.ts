import { describe, expect, it } from 'vitest';
import { resolveAdminProxyRoute } from '../../api/hub/admin/[...path]';

describe('consolidated admin proxy boundary', () => {
  it('allowlists the current administrative reads exactly', () => {
    expect(resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/self'))).toEqual({
      upstreamPath: '/v1/hub/admin/self',
      allowedMethod: 'GET',
    });
    expect(
      resolveAdminProxyRoute(
        new URL('https://hub.test/api/hub/admin/players?q=Nat&status=ACTIVE'),
      ),
    ).toEqual({
      upstreamPath: '/v1/hub/admin/players?q=Nat&status=ACTIVE',
      allowedMethod: 'GET',
    });
    expect(resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/reward-catalog'))).toEqual({
      upstreamPath: '/v1/hub/admin/reward-catalog',
      allowedMethod: 'GET',
    });
    expect(
      resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/audit?limit=100')),
    ).toEqual({
      upstreamPath: '/v1/hub/admin/audit?limit=100',
      allowedMethod: 'GET',
    });
    expect(
      resolveAdminProxyRoute(
        new URL('https://hub.test/api/hub/admin/audit?limit=100'),
        'POST',
      ),
    ).toBeNull();
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/players?playerId=11111111-1111-4111-8111-111111111111',
        ),
        'GET',
      ),
    ).toEqual({
      upstreamPath: '/v1/hub/admin/players/11111111-1111-4111-8111-111111111111',
      allowedMethod: 'GET',
    });
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/players?playerId=11111111-1111-4111-8111-111111111111&action=adjustments',
        ),
        'POST',
      ),
    ).toEqual({
      upstreamPath:
        '/v1/hub/admin/players/11111111-1111-4111-8111-111111111111/adjustments',
      allowedMethod: 'POST',
    });
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/team?principalId=11111111-1111-4111-8111-111111111111&action=capabilities',
        ),
        'PUT',
      ),
    ).toEqual({
      upstreamPath:
        '/v1/hub/admin/team/11111111-1111-4111-8111-111111111111/capabilities',
      allowedMethod: 'PUT',
    });
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/players/11111111-1111-4111-8111-111111111111',
        ),
      ),
    ).toEqual({
      upstreamPath:
        '/v1/hub/admin/players/11111111-1111-4111-8111-111111111111',
      allowedMethod: 'GET',
    });
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/players/11111111-1111-4111-8111-111111111111/adjustments',
        ),
      ),
    ).toEqual({
      upstreamPath:
        '/v1/hub/admin/players/11111111-1111-4111-8111-111111111111/adjustments',
      allowedMethod: 'POST',
    });
    expect(resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/operations'), 'GET')).toEqual({
      upstreamPath: '/v1/hub/admin/operations',
      allowedMethod: 'GET',
    });
    expect(resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/operations'), 'POST')).toEqual({
      upstreamPath: '/v1/hub/admin/operations',
      allowedMethod: 'POST',
    });
    expect(resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/operations'), 'DELETE')).toBeNull();
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/operations/22222222-2222-4222-8222-222222222222/confirm',
        ),
      ),
    ).toEqual({
      upstreamPath:
        '/v1/hub/admin/operations/22222222-2222-4222-8222-222222222222/confirm',
      allowedMethod: 'POST',
    });
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/operations?operationId=22222222-2222-4222-8222-222222222222&action=simulate',
        ),
        'POST',
      ),
    ).toEqual({
      upstreamPath:
        '/v1/hub/admin/operations/22222222-2222-4222-8222-222222222222/simulate',
      allowedMethod: 'POST',
    });
  });

  it('rejects malformed and unregistered admin routes instead of generic passthrough', () => {
    for (const path of [
      '/api/hub/admin/players/not-a-uuid',
      '/api/hub/admin/players/11111111-1111-4111-8111-111111111111/delete',
      '/api/hub/admin/players/not-a-uuid/adjustments',
      '/api/hub/admin/operations/not-a-uuid/confirm',
      '/api/hub/admin/operations/22222222-2222-4222-8222-222222222222/delete',
      '/api/hub/admin/battle/action',
    ]) {
      expect(resolveAdminProxyRoute(new URL(`https://hub.test${path}`))).toBeNull();
    }

    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/operations?operationId=not-a-uuid&action=simulate',
        ),
        'POST',
      ),
    ).toBeNull();
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/operations?operationId=22222222-2222-4222-8222-222222222222&action=delete',
        ),
        'POST',
      ),
    ).toBeNull();
    expect(
      resolveAdminProxyRoute(
        new URL('https://hub.test/api/hub/admin/players?playerId=not-a-uuid'),
        'GET',
      ),
    ).toBeNull();
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/players?playerId=11111111-1111-4111-8111-111111111111&action=delete',
        ),
        'POST',
      ),
    ).toBeNull();
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/team?principalId=11111111-1111-4111-8111-111111111111&action=capabilities',
        ),
        'POST',
      ),
    ).toBeNull();
  });
  it('allows strictly owner-scoped support history reads and notes without payment mutation routes', () => {
    const playerId = '11111111-1111-4111-8111-111111111111';
    const url = new URL(`https://hub.test/api/hub/admin/premium?playerId=${playerId}&resource=support`);
    for (const method of ['GET', 'POST']) {
      expect(resolveAdminProxyRoute(url, method)).toEqual({
        upstreamPath: `/v1/hub/admin/premium/players/${playerId}/support`,
        allowedMethod: method,
      });
    }
    for (const method of ['PUT', 'DELETE']) {
      expect(resolveAdminProxyRoute(url, method)).toBeNull();
    }
    expect(resolveAdminProxyRoute(
      new URL(`https://hub.test/api/hub/admin/premium?playerId=${playerId}&resource=support&paid=true`),
      'POST',
    )).toBeNull();
    expect(resolveAdminProxyRoute(
      new URL(`https://hub.test/api/hub/admin/premium?playerId=${playerId}&resource=orders`),
      'POST',
    )).toBeNull();
  });

  it('allows only exact owner Premium order approve/deliver actions', () => {
    const orderId = '88888888-8888-4888-8888-888888888888';
    for (const action of ['approve', 'deliver']) {
      const url = new URL(`https://hub.test/api/hub/admin/premium-action?orderId=${orderId}&action=${action}`);
      expect(resolveAdminProxyRoute(url, 'POST')).toEqual({
        upstreamPath: `/v1/hub/admin/premium/orders/${orderId}/${action}`,
        allowedMethod: 'POST',
      });
      expect(resolveAdminProxyRoute(url, 'GET')).toBeNull();
      expect(resolveAdminProxyRoute(url, 'DELETE')).toBeNull();
    }
    for (const query of [
      `orderId=${orderId}&action=cancel`,
      `orderId=${orderId}&action=approve&paid=true`,
      'orderId=bad&action=approve',
    ]) {
      expect(resolveAdminProxyRoute(new URL(`https://hub.test/api/hub/admin/premium-action?${query}`), 'POST')).toBeNull();
    }
  });

  it('only proxies owner Premium reads for valid players, never writes', () => {
    const playerId = '11111111-1111-4111-8111-111111111111';
    for (const resource of ['orders', 'entitlements']) {
      const target = new URL(`https://hub.test/api/hub/admin/premium?playerId=${playerId}&resource=${resource}`);
      expect(resolveAdminProxyRoute(target)).toEqual({
        upstreamPath: `/v1/hub/admin/premium/players/${playerId}/${resource}`,
        allowedMethod: 'GET',
      });
      for (const method of ['POST', 'PUT', 'DELETE']) {
        expect(resolveAdminProxyRoute(target, method)).toBeNull();
      }
    }
    for (const query of [
      'playerId=bad&resource=orders',
      `playerId=${playerId}&resource=payment`,
      `playerId=${playerId}&resource=orders&admin=true`,
    ]) {
      expect(resolveAdminProxyRoute(new URL(`https://hub.test/api/hub/admin/premium?${query}`))).toBeNull();
    }
  });

});
