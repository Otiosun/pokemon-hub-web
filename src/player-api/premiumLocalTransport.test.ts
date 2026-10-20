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
    expect(options.headers.get('cookie')).toBe(`${HUB_COOKIE}=correct.token`);
    expect(options.headers.get('cookie')).not.toContain('wrong.token');
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
