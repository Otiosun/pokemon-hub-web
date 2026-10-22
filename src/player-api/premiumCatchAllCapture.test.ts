import { afterEach, describe, expect, it, vi } from 'vitest';
import adminHandler from '../../api/hub/admin/[...path]';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function configurePremium(): void {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
  vi.stubEnv('PREMIUM_LOCAL_ENABLED', '1');
  vi.stubEnv('PREMIUM_LOCAL_APPROVED_ORIGIN', 'https://pokemon-api.otiosunbots.xyz');
}

describe('Vercel catch-all Premium routing with missing rewrite marker', () => {
  it('requires the existing Hub session after removing only a matching capture', async () => {
    configurePremium();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);

    for (const path of [
      'premium-auth/self',
      'premium/delivery/catalog',
      'premium/delivery/cases/catalog',
      'premium/delivery/items',
      'premium/delivery/packs/master',
    ]) {
      for (const capture of ['path', '...path']) {
        for (const value of [path, 'self']) {
          const url = new URL('https://hub.example.org/api/hub/admin/' + path);
          url.searchParams.set(capture, value);
          const result = await adminHandler.fetch(new Request(url));
          expect(result.status).toBe(401);
          expect(await result.json()).toEqual({ error: 'HUB_SESSION_REQUIRED' });
        }
      }
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it('preserves valid Premium functional queries and refuses unrelated parameters', async () => {
    configurePremium();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);

    const accepted = [
      'premium/players?q=Aurora',
      'premium/delivery/cases?playerId=11111111-1111-4111-8111-111111111111',
      'premium?playerId=11111111-1111-4111-8111-111111111111&resource=orders',
    ];
    for (const pathAndQuery of accepted) {
      const path = pathAndQuery.split('?')[0]!;
      const url = new URL('https://hub.example.org/api/hub/admin/' + pathAndQuery);
      url.searchParams.set('path', path);
      const result = await adminHandler.fetch(new Request(url));
      expect(result.status).toBe(401);
      expect(await result.json()).toEqual({ error: 'HUB_SESSION_REQUIRED' });
    }
    for (const suffix of [
      '?path=not-a-real-capture',
      '?path=premium-auth%2Fself&path=premium-auth%2Fself',
      '?path=premium-auth%2Fself&unknown=1',
      '?premiumRoute=catalog',
    ]) {
      const url = 'https://hub.example.org/api/hub/admin/premium-auth/self' + suffix;
      const result = await adminHandler.fetch(new Request(url));
      expect(result.status).toBe(404);
    }
    expect(upstream).not.toHaveBeenCalled();
  });
});
