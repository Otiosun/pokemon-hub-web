import { describe, expect, it, vi } from 'vitest';
import {
  benefitDisplayState,
  benefitPresentation,
  getOwnBenefits,
  remainingTimeLabel,
} from './playerPortalBenefitsClient';
import { resolvePlayerProxyRoute } from '../../api/hub/player/[...path]';
import { resolveProductRoute } from '../navigation/productIntegrity';
import { productRouteChunk } from '../navigation/productRoutePreload';

const original = {
  playerId: '11111111-1111-4111-8111-111111111111',
  entitlementKey: 'XP_2X',
  grantModel: 'TIMED',
  administrativeStatus: 'ACTIVE',
  startsAt: '2026-10-21T12:00:00.000Z',
  expiresAt: '2026-10-28T12:00:00.000Z',
  revision: '0',
  currentlyActive: true,
} as const;

describe('personal benefits - read-only privacy boundary', () => {
  it('only requests own entitlements using a same-origin Hub session cookie', async () => {
    const fetcher = vi.fn(async (_path: RequestInfo | URL, _opts?: RequestInit) =>
      Response.json({ entitlements: [original] }),
    );
    expect(await getOwnBenefits(fetcher)).toEqual({
      status: 'authenticated',
      benefits: [original],
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/hub/player/benefits');
    expect(fetcher.mock.calls[0]?.[1]).toEqual({
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
  });

  it('never assumes the player has no benefits when auth or API fails', async () => {
    expect(await getOwnBenefits(async () => new Response(null, { status: 401 }))).toEqual({
      status: 'unauthenticated',
    });
    expect(await getOwnBenefits(async () => new Response(null, { status: 404 }))).toEqual({
      status: 'unavailable',
    });
    expect(
      await getOwnBenefits(async () => {
        throw new Error('offline');
      }),
    ).toEqual({ status: 'unavailable' });
    expect(
      await getOwnBenefits(async () =>
        Response.json({ entitlements: [{ ...original, currentlyActive: 'true' }] }),
      ),
    ).toEqual({ status: 'unavailable' });
  });

  it('displays active, expired, and revoked according to server state and elapsed expiry', () => {
    expect(benefitDisplayState(original, Date.parse('2026-10-22T12:00:00.000Z'))).toBe('active');
    expect(benefitDisplayState(original, Date.parse('2026-10-29T12:00:00.000Z'))).toBe('expired');
    expect(benefitDisplayState({ ...original, currentlyActive: false })).toBe('expired');
    expect(benefitDisplayState({ ...original, administrativeStatus: 'REVOKED' })).toBe('revoked');
    expect(benefitPresentation('CAPTURE_LUCK_2X').name).toBe('Bênção da Sorte');
    expect(benefitPresentation('NOT_DEFINED').name).toBe('Benefício registrado');
  });

  it('calculates remaining duration from the actual expiry and handles permanent or inactive records', () => {
    expect(remainingTimeLabel(original, Date.parse('2026-10-27T10:30:00.000Z'))).toBe(
      '1 dia · 1 h · 30 min',
    );
    expect(remainingTimeLabel(original, Date.parse('2026-10-28T11:59:20.000Z'))).toBe(
      'Menos de 1 min',
    );
    expect(remainingTimeLabel(original, Date.parse('2026-10-28T12:00:00.000Z'))).toBe('Encerrado');
    expect(remainingTimeLabel({ ...original, grantModel: 'PERMANENT', expiresAt: null })).toBe(
      'Sem prazo',
    );
    expect(remainingTimeLabel({ ...original, administrativeStatus: 'REVOKED' })).toBe('Revogado');
    expect(remainingTimeLabel({ ...original, currentlyActive: false })).toBe('Encerrado');
  });

  it('exposes only exact GET with no target player or POST route', () => {
    const url = new URL('https://pokemon.example/api/hub/player/benefits');
    expect(resolvePlayerProxyRoute(url, 'GET')).toEqual({
      upstreamPath: '/v1/hub/player/benefits',
      allowedMethod: 'GET',
      premiumStaging: false,
    });
    expect(resolvePlayerProxyRoute(url, 'POST')).toBeNull();
    expect(
      resolvePlayerProxyRoute(
        new URL(url + '?playerId=11111111-1111-4111-8111-111111111111'),
        'GET',
      ),
    ).toBeNull();
    expect(
      resolvePlayerProxyRoute(
        new URL('https://pokemon.example/api/hub/player/benefits/private'),
        'GET',
      ),
    ).toBeNull();
  });

  it('uses the standard Journey route, not a Premium admin route', () => {
    expect(resolveProductRoute('/jornada/beneficios')).toEqual({ kind: 'route' });
    expect(productRouteChunk('/jornada/beneficios')).toBe('benefits');
  });
});
