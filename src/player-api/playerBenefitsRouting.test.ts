import { describe, expect, it } from 'vitest';
import { resolvePlayerProxyRoute } from '../../api/hub/player/[...path]';
import { resolveProductRoute } from '../navigation/productIntegrity';
import { productRouteChunk } from '../navigation/productRoutePreload';

describe('read-only Journey benefit routing', () => {
  const base = 'https://hub.example.test/api/hub/player/benefits';

  it('maps only clean GET requests to the ordinary signed Hub proxy', () => {
    expect(resolvePlayerProxyRoute(new URL(base), 'GET')).toEqual({
      upstreamPath: '/v1/hub/player/benefits',
      allowedMethod: 'GET',
      premiumStaging: false,
    });
    expect(resolvePlayerProxyRoute(new URL(base), 'POST')).toBeNull();
    expect(resolvePlayerProxyRoute(new URL(base + '?playerId=11111111-1111-4111-8111-111111111111'), 'GET')).toBeNull();
  });

  it('registers personal benefits under Journey, not an admin or store route', () => {
    expect(resolveProductRoute('/jornada/beneficios')).toEqual({ kind: 'route' });
    expect(productRouteChunk('/jornada/beneficios')).toBe('benefits');
    expect(resolveProductRoute('/jornada/beneficios/')).toEqual({ kind: 'route' });
  });
});
