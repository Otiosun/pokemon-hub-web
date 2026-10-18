import { describe, expect, it } from 'vitest';
import { resolvePlayerProxyRoute } from '../../api/hub/player/[...path]';

describe('consolidated player proxy', () => {
  it('keeps battle read-only at its original endpoint', () => {
    expect(resolvePlayerProxyRoute(new URL('https://hub.test/api/hub/player/battle'), 'GET')).toEqual({
      upstreamPath: '/v1/hub/player/battle',
      allowedMethod: 'GET',
    });
    for (const method of ['POST', 'PUT', 'DELETE']) {
      expect(resolvePlayerProxyRoute(new URL('https://hub.test/api/hub/player/battle'), method)).toBeNull();
    }
  });

  it('allows only POST for creating an unpaid pending Premium order', () => {
    expect(resolvePlayerProxyRoute(new URL('https://hub.test/api/hub/player/premium/orders'), 'POST')).toEqual({
      upstreamPath: '/v1/hub/player/premium/orders',
      allowedMethod: 'POST',
    });
    expect(resolvePlayerProxyRoute(new URL('https://hub.test/api/hub/player/premium/orders'), 'GET')).toBeNull();
    for (const pathname of [
      '/api/hub/player/premium/orders/paid',
      '/api/hub/player/premium/fulfill',
      '/api/hub/player/battle/action',
      '/api/hub/player/encounter',
    ]) {
      expect(resolvePlayerProxyRoute(new URL(`https://hub.test${pathname}`), 'POST')).toBeNull();
    }
  });
});
