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
  });

  it('rejects malformed and unregistered admin routes instead of generic passthrough', () => {
    for (const path of [
      '/api/hub/admin/players/not-a-uuid',
      '/api/hub/admin/players/11111111-1111-4111-8111-111111111111/delete',
      '/api/hub/admin/operations',
      '/api/hub/admin/battle/action',
    ]) {
      expect(resolveAdminProxyRoute(new URL(`https://hub.test${path}`))).toBeNull();
    }
  });
});
