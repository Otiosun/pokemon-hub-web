import { afterEach, describe, expect, it, vi } from 'vitest';
import adminHandler from '../../api/hub/admin/[...path]';
import { HUB_COOKIE, PREMIUM_STAGE_COOKIE } from './premiumStagingSessionCookies';

const origin = 'https://pokemon-api.otiosunbots.xyz';
const site = 'https://hub.example.org';
const endpoint = site + '/api/hub/admin/premium/delivery/packs/master';
const cookie = `${HUB_COOKIE}=signed.session`;
const owner = '11111111-1111-4111-8111-111111111111';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function configure(): void {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', origin);
  vi.stubEnv('PREMIUM_LOCAL_ENABLED', '1');
  vi.stubEnv('PREMIUM_LOCAL_APPROVED_ORIGIN', origin);
}

function adminResponse(authorized: boolean): Response {
  return new Response(JSON.stringify({
    admin: authorized ? {
      principalId: owner, owner: true, capabilities: ['central.view'],
    } : {
      principalId: owner, owner: false, capabilities: ['central.view'],
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('Live Premium uses the existing owner Hub session safely', () => {
  it('fails closed if the production Premium feature is disabled', async () => {
    configure();
    vi.stubEnv('PREMIUM_LOCAL_ENABLED', '0');
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const result = await adminHandler.fetch(new Request(endpoint, {
      headers: { cookie },
    }));
    expect(result.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('refuses anonymous requests and isolated Premium cookies without calling upstream', async () => {
    configure();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    for (const headers of [
      {},
      { cookie: `${PREMIUM_STAGE_COOKIE}=isolated.session` },
    ]) {
      const res = await adminHandler.fetch(new Request(endpoint, { headers }));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'HUB_SESSION_REQUIRED' });
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it('allows a verified live owner automatically and preserves only the Hub cookie', async () => {
    configure();
    const calls: Array<{ url: string; method: string; cookie: string | null }> = [];
    const upstream = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? 'GET', cookie: new Headers(init.headers).get('cookie') });
      if (url === origin + '/v1/hub/admin/self') return adminResponse(true);
      if (url === origin + '/v1/hub/admin/premium/delivery/catalog') {
        return new Response(JSON.stringify({ products: [] }), {
          status: 200,
          headers: { 'set-cookie': `${HUB_COOKIE}=unexpected.token; Path=/; Secure` },
        });
      }
      throw new Error('Unexpected upstream path');
    });
    vi.stubGlobal('fetch', upstream);
    const headers = {
      cookie: `${cookie}; ${PREMIUM_STAGE_COOKIE}=ignore.this`,
    };
    const self = await adminHandler.fetch(new Request(site + '/api/hub/admin/premium-auth/self', {
      headers,
    }));
    expect(self.status).toBe(200);
    expect((await self.json()).admin.owner).toBe(true);

    const catalog = await adminHandler.fetch(new Request(
      site + '/api/hub/admin/premium/delivery/catalog',
      { headers },
    ));
    expect(catalog.status).toBe(200);
    expect(catalog.headers.has('set-cookie')).toBe(false);
    expect(calls).toEqual([
      { url: origin + '/v1/hub/admin/self', method: 'GET', cookie },
      { url: origin + '/v1/hub/admin/self', method: 'GET', cookie },
      { url: origin + '/v1/hub/admin/premium/delivery/catalog', method: 'GET', cookie },
    ]);
  });

  it('blocks an ordinary admin without owner permission before a grant', async () => {
    configure();
    const upstream = vi.fn(async (url: string) => {
      if (url === origin + '/v1/hub/admin/self') return adminResponse(false);
      throw new Error('Grant must not be reached');
    });
    vi.stubGlobal('fetch', upstream);
    const result = await adminHandler.fetch(new Request(endpoint, { headers: { cookie } }));
    expect(result.status).toBe(403);
    expect(await result.json()).toEqual({ error: 'PREMIUM_FORBIDDEN' });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('blocks missing central.view or absent admin before any grant', async () => {
    configure();
    const upstream = vi.fn(async (url: string) => {
      if (url !== origin + '/v1/hub/admin/self') throw new Error('No grant allowed');
      return new Response(JSON.stringify({
        admin: { principalId: owner, owner: true, capabilities: ['players.read'] },
      }), { status: 200 });
    });
    vi.stubGlobal('fetch', upstream);
    const result = await adminHandler.fetch(new Request(endpoint, { headers: { cookie } }));
    expect(result.status).toBe(403);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('rejects obsolete ticket exchange and financial approval endpoints', async () => {
    configure();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const exchange = await adminHandler.fetch(new Request(
      site + '/api/hub/admin/premium-auth/exchange',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' },
    ));
    expect(exchange.status).toBe(404);
    const oldPay = await adminHandler.fetch(new Request(
      site + '/api/hub/admin/premium/orders/22222222-2222-4222-8222-222222222222/approve',
      { method: 'POST', headers: { origin: site }, body: '{}' },
    ));
    expect(oldPay.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('refuses cross-origin mutations before any authorization check', async () => {
    configure();
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const result = await adminHandler.fetch(new Request(endpoint, {
      method: 'POST', headers: { origin: 'https://evil.example.org', cookie }, body: '{}',
    }));
    expect(result.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('keeps audited rewrite routes and only forwards authenticated owner operations', async () => {
    configure();
    const targets: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      targets.push(url);
      return url === origin + '/v1/hub/admin/self'
        ? adminResponse(true)
        : new Response('{}', { status: 200 });
    }));
    for (const [key, upstream] of [
      ['auth-self', '/v1/hub/admin/self'],
      ['catalog', '/v1/hub/admin/premium/delivery/catalog'],
      ['cases-catalog', '/v1/hub/admin/premium/delivery/cases/catalog'],
      ['items', '/v1/hub/admin/premium/delivery/items'],
      ['master', '/v1/hub/admin/premium/delivery/packs/master'],
    ]) {
      const request = new Request(site + '/api/hub/admin/self?premiumRoute=' + key, {
        headers: { cookie },
      });
      const response = await adminHandler.fetch(request);
      expect(response.status).toBe(200);
      expect(targets.at(-1)).toBe(origin + upstream);
    }
    expect(targets.filter((target) => target === origin + '/v1/hub/admin/self')).toHaveLength(5);
  });

  it('allows only exact Vercel captures, not arbitrary query values', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url === origin + '/v1/hub/admin/self'
        ? adminResponse(true)
        : new Response('{}', { status: 200 })));

    const valid = site + '/api/hub/admin/premium/delivery/catalog?path=premium%2Fdelivery%2Fcatalog';
    expect((await adminHandler.fetch(new Request(valid, { headers: { cookie } }))).status).toBe(200);

    for (const suffix of [
      '?unknown=1',
      '?path=wrong',
      '?path=premium%2Fdelivery%2Fcatalog&path=premium%2Fdelivery%2Fcatalog',
      '?premiumRoute=auth-self',
    ]) {
      const response = await adminHandler.fetch(new Request(
        site + '/api/hub/admin/premium/delivery/catalog' + suffix, { headers: { cookie } },
      ));
      expect(response.status).toBe(404);
    }
  });
});
