import { describe, expect, it, vi } from 'vitest';
import { benefitIsActive, readPlayerBenefits } from './playerPortalBenefitsClient';
import { resolvePlayerProxyRoute } from '../../api/hub/player/[...path]';
import { resolveProductRoute } from '../navigation/productIntegrity';
import { productRouteChunk } from '../navigation/productRoutePreload';

const playerId = '11111111-1111-4111-8111-111111111111';
const valid = {
  playerId, entitlementKey: 'XP_2X', grantModel: 'TIMED',
  administrativeStatus: 'ACTIVE',
  startsAt: '2026-10-22T10:00:00.000Z',
  expiresAt: '2026-10-29T10:00:00.000Z',
  revision: '3', currentlyActive: true,
} as const;

describe('Meus Benefícios — secure read-only player flow', () => {
  it('supports an authenticated GET only and never accepts player ID from the browser', () => {
    const url = new URL('https://hub.example/api/hub/player/benefits');
    expect(resolvePlayerProxyRoute(url, 'GET')).toEqual({
      upstreamPath: '/v1/hub/player/benefits', allowedMethod: 'GET', premiumStaging: false,
    });
    expect(resolvePlayerProxyRoute(url, 'POST')).toBeNull();
    expect(resolvePlayerProxyRoute(new URL(url.href + '?playerId=' + playerId), 'GET')).toBeNull();
  });

  it('keeps the benefits page as a real child of Jornada', () => {
    expect(resolveProductRoute('/jornada/beneficios')).toEqual({ kind: 'route' });
    expect(productRouteChunk('/jornada/beneficios')).toBe('benefits');
  });

  it('reads signed player benefits without writing or passing any identity parameter', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ entitlements: [valid] }), { status: 200 }));
    const response = await readPlayerBenefits(fetcher);
    expect(response).toEqual({ status: 'ready', entitlements: [valid] });
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/hub/player/benefits');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET', credentials: 'include', cache: 'no-store',
    });
  });

  it('never interprets an offline backend, invalid response, or expired session as no benefits', async () => {
    expect(await readPlayerBenefits(async () => new Response(null, { status: 401 }))).toEqual({
      status: 'unauthenticated',
    });
    expect(await readPlayerBenefits(async () => new Response(null, { status: 503 }))).toEqual({
      status: 'unavailable',
    });
    expect(await readPlayerBenefits(async () => new Response(JSON.stringify({
      entitlements: [{ ...valid, playerId: 'invalid' }],
    }), { status: 200 }))).toEqual({ status: 'unavailable' });
  });

  it('recalculates time and respects revocation, rather than trusting a stale active flag', () => {
    const during = Date.parse('2026-10-23T10:00:00.000Z');
    const after = Date.parse('2026-10-30T10:00:00.000Z');
    expect(benefitIsActive(valid, during)).toBe(true);
    expect(benefitIsActive(valid, after)).toBe(false);
    expect(benefitIsActive({ ...valid, administrativeStatus: 'REVOKED' }, during)).toBe(false);
    expect(benefitIsActive({
      ...valid, entitlementKey: 'CAPTURE_LUCK_2X', grantModel: 'PERMANENT', expiresAt: null,
    }, after)).toBe(true);
  });
});
