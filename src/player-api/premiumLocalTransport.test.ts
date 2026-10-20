import { afterEach, describe, expect, it, vi } from 'vitest';
import adminHandler from '../../api/hub/admin/[...path]';
import { HUB_COOKIE, PREMIUM_STAGE_COOKIE } from './premiumStagingSessionCookies';

const origin = 'https://pokemon-api.otiosunbots.xyz';
const endpoint = 'https://hub.example.org/api/hub/admin/premium/delivery/packs/master';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function configure() {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', origin);
  vi.stubEnv('PREMIUM_LOCAL_ENABLED', '1');
  vi.stubEnv('PREMIUM_LOCAL_APPROVED_ORIGIN', origin);
}

describe('PC-hosted Premium manual BFF owner boundary', () => {
  it('does not proxy when local activation is absent', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', origin);
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const result = await adminHandler.fetch(new Request(endpoint, {
      headers: { cookie: `${PREMIUM_STAGE_COOKIE}=abc.def` },
    }));
    expect(result.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('does not accept a normal Hub cookie in place of separate premium identity', async () => {
    configure();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const result = await adminHandler.fetch(new Request(endpoint, {
      headers: { cookie: `${HUB_COOKIE}=abc.def` },
    }));
    expect(result.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('forwards only the separately authenticated cookie to approved existing HTTPS API', async () => {
    configure();
    const upstream = vi.fn(async (_target: string, _options: RequestInit) => new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', upstream);
    const response = await adminHandler.fetch(new Request(endpoint, {
      headers: {
        cookie: `${HUB_COOKIE}=wrong.token; ${PREMIUM_STAGE_COOKIE}=correct.token`,
      },
    }));
    expect(response.status).toBe(401);
    expect(upstream).toHaveBeenCalledTimes(1);
    const [target, options] = upstream.mock.calls[0]!;
    expect(target).toBe(origin + '/v1/hub/admin/premium/delivery/packs/master');
    expect(new Headers(options.headers).get('cookie')).toBe(`${HUB_COOKIE}=correct.token`);
    expect(new Headers(options.headers).get('cookie')).not.toContain('wrong.token');
  });

  it('exchanges a one-time ticket and uses only the separate Premium cookie in production', async () => {
    configure();
    const site = 'https://hub.example.org';
    const ticket = 'T'.repeat(43);
    const token = 'signed.session';
    const owner = '11111111-1111-4111-8111-111111111111';
    const forwarded: Array<{ url: string; method: string; cookie: string | null }> = [];
    const upstream = vi.fn(async (target: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      forwarded.push({ url: target, method: init.method ?? 'GET', cookie: headers.get('cookie') });
      if (target === origin + '/v1/hub/auth/exchange') {
        expect(init.method).toBe('POST');
        expect(init.body).toBe(JSON.stringify({ ticket }));
        return new Response(JSON.stringify({ profile: { playerId: owner } }), {
          status: 200,
          headers: {
            'set-cookie': `${HUB_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=43200`,
            'content-type': 'application/json',
          },
        });
      }
      if (target === origin + '/v1/hub/admin/self') return new Response(JSON.stringify({
        admin: { principalId: owner, owner: true, capabilities: ['central.view'] },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
      if (target === origin + '/v1/hub/admin/premium/delivery/catalog')
        return new Response(JSON.stringify({ products: [] }), { status: 200 });
      throw new Error('Unexpected upstream path');
    });
    vi.stubGlobal('fetch', upstream);

    const exchange = await adminHandler.fetch(new Request(site + '/api/hub/admin/premium-auth/exchange', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `${HUB_COOKIE}=normal.session` },
      body: JSON.stringify({ ticket }),
    }));
    expect(exchange.status).toBe(200);
    const premiumCookie = exchange.headers.get('set-cookie');
    expect(premiumCookie).toContain(`${PREMIUM_STAGE_COOKIE}=${token};`);
    expect(premiumCookie).not.toContain(`${HUB_COOKIE}=`);

    const cookies = `${HUB_COOKIE}=normal.session; ${PREMIUM_STAGE_COOKIE}=${token}`;
    const self = await adminHandler.fetch(new Request(site + '/api/hub/admin/premium-auth/self', {
      headers: { cookie: cookies },
    }));
    expect(self.status).toBe(200);
    expect((await self.json()).admin.owner).toBe(true);

    const catalog = await adminHandler.fetch(new Request(site + '/api/hub/admin/premium/delivery/catalog', {
      headers: { cookie: cookies },
    }));
    expect(catalog.status).toBe(200);

    const denied = await adminHandler.fetch(new Request(site + '/api/hub/admin/premium/delivery/catalog', {
      headers: { cookie: `${HUB_COOKIE}=normal.session` },
    }));
    expect(denied.status).toBe(401);
    expect(forwarded).toEqual([
      { url: origin + '/v1/hub/auth/exchange', method: 'POST', cookie: null },
      { url: origin + '/v1/hub/admin/self', method: 'GET', cookie: `${HUB_COOKIE}=${token}` },
      { url: origin + '/v1/hub/admin/premium/delivery/catalog', method: 'GET', cookie: `${HUB_COOKIE}=${token}` },
    ]);
    expect(upstream).toHaveBeenCalledTimes(3);
  });

  it('refuses external Origin for mutation before touching the local API', async () => {
    configure();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const response = await adminHandler.fetch(new Request(endpoint, {
      method: 'POST', headers: {
        origin: 'https://evil.example.org',
        cookie: `${PREMIUM_STAGE_COOKIE}=correct.token`,
      }, body: '{}',
    }));
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('retains the 404 refusal for obsolete financial approval routes in local mode', async () => {
    configure();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const response = await adminHandler.fetch(new Request(
      'https://hub.example.org/api/hub/admin/premium/orders/22222222-2222-4222-8222-222222222222/approve',
      { method: 'POST', headers: { cookie: `${PREMIUM_STAGE_COOKIE}=correct.token` }, body: '{}' },
    ));
    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
});
