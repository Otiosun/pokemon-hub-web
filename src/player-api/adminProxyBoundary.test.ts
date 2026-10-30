import { describe, expect, it } from 'vitest';
import { resolveAdminProxyRoute } from '../../api/hub/admin/[...path]';

describe('consolidated admin proxy boundary', () => {
  it('allowlists the current administrative reads exactly', () => {
    expect(resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/self'))).toEqual({
      upstreamPath: '/v1/hub/admin/self',
      allowedMethod: 'GET',
    });
    expect(
      resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/players?q=Nat&status=ACTIVE')),
    ).toEqual({
      upstreamPath: '/v1/hub/admin/players?q=Nat&status=ACTIVE',
      allowedMethod: 'GET',
    });
    expect(
      resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/reward-catalog')),
    ).toEqual({
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
      resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/audit?limit=100'), 'POST'),
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
      upstreamPath: '/v1/hub/admin/players/11111111-1111-4111-8111-111111111111/adjustments',
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
      upstreamPath: '/v1/hub/admin/team/11111111-1111-4111-8111-111111111111/capabilities',
      allowedMethod: 'PUT',
    });
    expect(
      resolveAdminProxyRoute(
        new URL('https://hub.test/api/hub/admin/players/11111111-1111-4111-8111-111111111111'),
      ),
    ).toEqual({
      upstreamPath: '/v1/hub/admin/players/11111111-1111-4111-8111-111111111111',
      allowedMethod: 'GET',
    });
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/players/11111111-1111-4111-8111-111111111111/adjustments',
        ),
      ),
    ).toEqual({
      upstreamPath: '/v1/hub/admin/players/11111111-1111-4111-8111-111111111111/adjustments',
      allowedMethod: 'POST',
    });
    expect(
      resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/operations'), 'GET'),
    ).toEqual({
      upstreamPath: '/v1/hub/admin/operations',
      allowedMethod: 'GET',
    });
    expect(
      resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/operations'), 'POST'),
    ).toEqual({
      upstreamPath: '/v1/hub/admin/operations',
      allowedMethod: 'POST',
    });
    expect(
      resolveAdminProxyRoute(new URL('https://hub.test/api/hub/admin/operations'), 'DELETE'),
    ).toBeNull();
    expect(
      resolveAdminProxyRoute(
        new URL(
          'https://hub.test/api/hub/admin/operations/22222222-2222-4222-8222-222222222222/confirm',
        ),
      ),
    ).toEqual({
      upstreamPath: '/v1/hub/admin/operations/22222222-2222-4222-8222-222222222222/confirm',
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
      upstreamPath: '/v1/hub/admin/operations/22222222-2222-4222-8222-222222222222/simulate',
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
        new URL('https://hub.test/api/hub/admin/operations?operationId=not-a-uuid&action=simulate'),
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
});
