import { afterEach, describe, expect, it, vi } from 'vitest';
import premiumProxy, { canDelegatePremiumRoute } from '../../api/hub/admin/[...path]';
import { HUB_COOKIE } from './premiumStagingSessionCookies';
import { resolvePremiumStageAdminRoute } from './premiumStagingRoutes';

const api = 'https://pokemon-api.otiosunbots.xyz';
const hub = 'https://hub.example.org';
const cookie = `${HUB_COOKIE}=signed.session`;
const playerId = '11111111-1111-4111-8111-111111111111';

function configure(): void {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', api);
  vi.stubEnv('PREMIUM_LOCAL_ENABLED', '1');
  vi.stubEnv('PREMIUM_LOCAL_APPROVED_ORIGIN', api);
}

function self(capabilities: string[], owner = false): Response {
  return new Response(
    JSON.stringify({
      admin: { principalId: playerId, owner, capabilities },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('delegated Premium API boundary: owner remains required elsewhere', () => {
  it('does not allow a broad game admin grant to impersonate a commercial delegate', async () => {
    configure();
    const upstream = vi.fn(async (url: string) => {
      if (url === api + '/v1/hub/admin/self')
        return self(['central.view', 'reward.grant', 'inventory.adjust']);
      throw new Error('Unexpected grant attempt');
    });
    vi.stubGlobal('fetch', upstream);
    const result = await premiumProxy.fetch(
      new Request(hub + '/api/hub/admin/premium/delivery/catalog', { headers: { cookie } }),
    );
    expect(result.status).toBe(403);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('allows explicitly delegated 2XP/LUCK catalog, grant, history and recipient search only', async () => {
    configure();
    const calls: string[] = [];
    const upstream = vi.fn(async (url: string) => {
      calls.push(url);
      if (url === api + '/v1/hub/admin/self')
        return self(['central.view', 'premium.delivery.grant', 'player.read']);
      if (url === api + '/v1/hub/admin/premium/delivery/catalog')
        return Response.json({ products: [{ sku: '2XP' }, { sku: 'LUCK' }] });
      if (url === api + '/v1/hub/admin/premium/delivery')
        return Response.json({ applied: true, replayed: false, requestId: playerId });
      if (url === api + `/v1/hub/admin/premium/players/${playerId}/deliveries`)
        return Response.json({ deliveries: [] });
      if (url === api + '/v1/hub/admin/players?q=Ash&limit=8')
        return Response.json({ players: [] });
      throw new Error('Unapproved upstream path ' + url);
    });
    vi.stubGlobal('fetch', upstream);

    const get = async (p: string) =>
      premiumProxy.fetch(
        new Request(hub + p, {
          headers: { cookie },
        }),
      );
    expect((await get('/api/hub/admin/premium/delivery/catalog')).status).toBe(200);
    const grant = await premiumProxy.fetch(
      new Request(hub + '/api/hub/admin/premium/delivery', {
        method: 'POST',
        headers: { cookie, origin: hub, 'content-type': 'application/json' },
        body: JSON.stringify({
          requestId: playerId,
          playerId,
          sku: '2XP',
          quantity: 1,
          reason: 'Comprovante validado fora do sistema.',
        }),
      }),
    );
    expect(grant.status).toBe(200);
    expect(
      (await get(`/api/hub/admin/premium?playerId=${playerId}&resource=deliveries`)).status,
    ).toBe(200);
    expect((await get('/api/hub/admin/premium/players?q=Ash')).status).toBe(200);

    expect(calls.filter((url) => url === api + '/v1/hub/admin/self')).toHaveLength(4);
    expect(calls).toContain(api + '/v1/hub/admin/premium/delivery');
    expect(calls).toContain(api + `/v1/hub/admin/premium/players/${playerId}/deliveries`);
  });

  it('denies even a delegated ADM access to inventory, Pokemon, packs, cases, entitlements and owner auth', async () => {
    configure();
    const upstream = vi.fn(async (url: string) => {
      if (url === api + '/v1/hub/admin/self')
        return self(['central.view', 'premium.delivery.grant', 'player.read']);
      throw new Error('No owner-only API may be reached');
    });
    vi.stubGlobal('fetch', upstream);
    for (const path of [
      '/api/hub/admin/premium/delivery/items',
      '/api/hub/admin/premium/delivery/pokemon',
      '/api/hub/admin/premium/delivery/packs/master',
      '/api/hub/admin/premium/delivery/cases/catalog',
      `/api/hub/admin/premium?playerId=${playerId}&resource=entitlements`,
      '/api/hub/admin/premium-auth/self',
    ]) {
      const result = await premiumProxy.fetch(new Request(hub + path, { headers: { cookie } }));
      expect(result.status).toBe(403);
    }
    expect(upstream).toHaveBeenCalledTimes(6);
  });

  it('does not leak player search to a delegated ADM without player.read', async () => {
    configure();
    const upstream = vi.fn(async (url: string) => {
      if (url === api + '/v1/hub/admin/self')
        return self(['central.view', 'premium.delivery.grant']);
      throw new Error('Player search must not be reached');
    });
    vi.stubGlobal('fetch', upstream);
    const result = await premiumProxy.fetch(
      new Request(hub + '/api/hub/admin/premium/players?q=Ash', { headers: { cookie } }),
    );
    expect(result.status).toBe(403);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('matches only exact allowlisted route+method pairs, not arbitrary Proxy targets', () => {
    const admin = {
      owner: false,
      capabilities: ['central.view', 'premium.delivery.grant', 'player.read'],
    };
    const route = (p: string, method: string) =>
      resolvePremiumStageAdminRoute(new URL(hub + p), method);
    const allowed = route('/api/hub/admin/premium/delivery', 'POST');
    expect(allowed && canDelegatePremiumRoute(admin, allowed)).toBe(true);
    const blocked = route('/api/hub/admin/premium/delivery/packs/master', 'POST');
    expect(blocked && canDelegatePremiumRoute(admin, blocked)).toBe(false);
    expect(route('/api/hub/admin/premium/delivery', 'GET')).toBeNull();
  });
});
