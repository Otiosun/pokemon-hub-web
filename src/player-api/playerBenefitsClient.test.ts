import { describe, expect, it, vi } from 'vitest';
import {
  benefitDisplayState,
  benefitTitle,
  getPlayerBenefits,
  type PlayerBenefit,
} from './playerBenefitsClient';

const playerId = '11111111-1111-4111-8111-111111111111';
const base: PlayerBenefit = {
  playerId,
  entitlementKey: 'XP_2X',
  grantModel: 'TIMED',
  administrativeStatus: 'ACTIVE',
  startsAt: '2026-10-22T00:00:00.000Z',
  expiresAt: '2026-10-29T00:00:00.000Z',
  revision: '1',
  currentlyActive: true,
};

describe('authenticated Meus Benefícios client', () => {
  it('fetches only self benefits via the ordinary Hub session, without a playerId', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ entitlements: [base] }), { status: 200 }));
    expect(await getPlayerBenefits(fetcher)).toEqual({
      status: 'authenticated',
      entitlements: [base],
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/hub/player/benefits');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
  });

  it('never displays absence of benefits when the API is offline or not deployed', async () => {
    for (const code of [404, 403, 500, 503]) {
      expect(await getPlayerBenefits(async () => new Response(null, { status: code })))
        .toEqual({ status: 'unavailable' });
    }
    expect(await getPlayerBenefits(async () => new Response(null, { status: 401 })))
      .toEqual({ status: 'unauthenticated' });
  });

  it('rejects mixed identities and malformed backend rows', async () => {
    const second = { ...base, playerId: '22222222-2222-4222-8222-222222222222' };
    for (const records of [[base, second], [{ ...base, revision: 'NaN' }], [{ ...base, expiresAt: 'invalid' }]]) {
      expect(await getPlayerBenefits(async () =>
        new Response(JSON.stringify({ entitlements: records }), { status: 200 })))
        .toEqual({ status: 'unavailable' });
    }
  });

  it('distinguishes active, revoked and elapsed timed effects, including local deadline', () => {
    const before = Date.parse('2026-10-23T00:00:00.000Z');
    const after = Date.parse('2026-11-01T00:00:00.000Z');
    expect(benefitDisplayState(base, before)).toBe('active');
    expect(benefitDisplayState(base, after)).toBe('expired');
    expect(benefitDisplayState({ ...base, administrativeStatus: 'REVOKED' }, before)).toBe('revoked');
    expect(benefitDisplayState({
      ...base,
      grantModel: 'PERMANENT',
      expiresAt: null,
    }, after)).toBe('active');
    expect(benefitTitle('XP_2X')).toBe('Experiência em dobro');
    expect(benefitTitle('CAPTURE_LUCK_2X')).toBe('Bênção da Sorte');
  });
});
