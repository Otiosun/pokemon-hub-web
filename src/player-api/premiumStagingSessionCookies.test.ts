import { afterEach, describe, expect, it, vi } from 'vitest';
import adminHandler from '../../api/hub/admin/[...path]';
import {
  HUB_COOKIE,
  PREMIUM_STAGE_COOKIE,
  scopedSessionCookie,
  stageExchangeCookie,
  clearPremiumStageCookie,
} from './premiumStagingSessionCookies';

const real = 'AAAA.BBBB';
const staged = 'CCCC.DDDD';
const both = `${HUB_COOKIE}=${real}; ${PREMIUM_STAGE_COOKIE}=${staged}; analytics=other`;
const server = 'https://hub-preview.example.org';
const stage = 'https://isolated-api.example.org';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function activateStage(): void {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
  vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', stage);
  vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', stage);
  vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
}

describe('independent Premium staging credentials', () => {
  it('never forwards a normal/prod cookie or unrelated cookie to the staging API', () => {
    expect(scopedSessionCookie(both, 'premium-stage')).toBe(`${HUB_COOKIE}=${staged}`);
    expect(scopedSessionCookie(both, 'normal')).toBe(`${HUB_COOKIE}=${real}`);
    expect(scopedSessionCookie(both, 'none')).toBeNull();
    expect(scopedSessionCookie(`${HUB_COOKIE}=${real}`, 'premium-stage')).toBeNull();
    expect(scopedSessionCookie(`${PREMIUM_STAGE_COOKIE}=${staged}`, 'normal')).toBeNull();
    expect(scopedSessionCookie(`${PREMIUM_STAGE_COOKIE}=${staged}; ${PREMIUM_STAGE_COOKIE}=${real}`, 'premium-stage')).toBeNull();
  });

  it('rewrites only a valid signed backend cookie into a host-only secure staging cookie', () => {
    const upstream = `${HUB_COOKIE}=${staged}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;
    const parsed = stageExchangeCookie(upstream);
    expect(parsed).toBe(`${PREMIUM_STAGE_COOKIE}=${staged}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=43200`);
    expect(clearPremiumStageCookie()).toContain(`${PREMIUM_STAGE_COOKIE}=;`);
    for (const bad of [
      null, `${HUB_COOKIE}=${real}; Path=/; HttpOnly; SameSite=Lax; Max-Age=100`,
      `${HUB_COOKIE}=${real}; Path=/; HttpOnly; Secure; Domain=example.org; SameSite=Lax; Max-Age=100`,
      `${HUB_COOKIE}=${real}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=999999`,
      `${HUB_COOKIE}=injected; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=100`,
    ]) expect(stageExchangeCookie(bad)).toBeNull();
  });

  it('requires staging credentials for MASTER even if a production browser session exists', async () => {
    activateStage();
    const upstream = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const endpoint = `${server}/api/hub/admin/premium/delivery/packs/master`;
    const denied = await adminHandler.fetch(new Request(endpoint, {
      method: 'POST', headers: { cookie: `${HUB_COOKIE}=${real}` }, body: '{}',
    }));
    expect(denied.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
    const allowed = await adminHandler.fetch(new Request(endpoint, {
      method: 'POST', headers: { cookie: both }, body: '{}',
    }));
    expect(allowed.status).toBe(200);
    const [url, init] = upstream.mock.calls[0]!;
    expect(url).toBe(`${stage}/v1/hub/admin/premium/delivery/packs/master`);
    expect(new Headers(init?.headers).get('cookie')).toBe(`${HUB_COOKIE}=${staged}`);
    expect(new Headers(init?.headers).get('cookie')).not.toContain(real);
  });

  it('issues the staging cookie from the approved staging auth exchange, never the prod one', async () => {
    activateStage();
    const upstreamCookie = `${HUB_COOKIE}=${staged}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;
    const upstream = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response('{}', {
      status: 200, headers: { 'set-cookie': upstreamCookie, 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', upstream);
    const ticket = 'A'.repeat(43);
    const login = await adminHandler.fetch(new Request(`${server}/api/hub/admin/premium-auth/exchange`, {
      method: 'POST',
      headers: { cookie: both, 'content-type': 'application/json' },
      body: JSON.stringify({ ticket }),
    }));
    expect(login.status).toBe(200);
    expect(login.headers.get('set-cookie')).toContain(PREMIUM_STAGE_COOKIE);
    expect(login.headers.get('set-cookie')).not.toContain(`${HUB_COOKIE}=`);
    expect(new Headers(upstream.mock.calls[0]![1]?.headers).get('cookie')).toBeNull();
    const check = await adminHandler.fetch(new Request(`${server}/api/hub/admin/premium-auth/self`, {
      headers: { cookie: both },
    }));
    expect(check.status).toBe(200);
    expect(new Headers(upstream.mock.calls[1]![1]?.headers).get('cookie')).toBe(`${HUB_COOKIE}=${staged}`);
    expect(upstream.mock.calls[1]![0]).toBe(`${stage}/v1/hub/admin/self`);
  });

  it('does not pass staging cookies to normal live admin routes, and clears only staging on logout', async () => {
    activateStage();
    const upstream = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const normal = await adminHandler.fetch(new Request(`${server}/api/hub/admin/self`, {
      headers: { cookie: both },
    }));
    expect(normal.status).toBe(200);
    expect(new Headers(upstream.mock.calls[0]![1]?.headers).get('cookie')).toBe(`${HUB_COOKIE}=${real}`);
    const signOut = await adminHandler.fetch(new Request(`${server}/api/hub/admin/premium-auth/logout`, {
      method: 'POST', headers: { cookie: both },
    }));
    expect(signOut.status).toBe(200);
    expect(signOut.headers.get('set-cookie')).toBe(clearPremiumStageCookie());
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('blocks foreign-origin Premium writes before reaching any staging service', async () => {
    activateStage();
    const upstream = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    for (const url of [
      `${server}/api/hub/admin/premium/delivery`,
      `${server}/api/hub/admin/premium/delivery/packs/master`,
      `${server}/api/hub/admin/premium-auth/exchange`,
    ]) {
      const denied = await adminHandler.fetch(new Request(url, {
        method: 'POST',
        headers: {
          cookie: both,
          origin: 'https://malicious.example.net',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ticket: 'A'.repeat(43) }),
      }));
      expect(denied.status).toBe(403);
      await expect(denied.json()).resolves.toEqual({ error: 'CROSS_ORIGIN_STAGING_MUTATION' });
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it('fails closed without approved upstream and never exposes staging cookie to production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', stage);
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', stage);
    const upstream = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response('unexpected'));
    vi.stubGlobal('fetch', upstream);
    const response = await adminHandler.fetch(new Request(`${server}/api/hub/admin/premium-auth/self`, {
      headers: { cookie: both },
    }));
    expect(response.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });
});
