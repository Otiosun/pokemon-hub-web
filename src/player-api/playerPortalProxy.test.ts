import { describe, expect, it, vi } from 'vitest';
import { proxyPlayerPortalRequest } from './playerPortalProxy';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const baseUrl = 'https://player-api.example.test';

describe('proxyPlayerPortalRequest', () => {
  it('forwards the authenticated self read to the canonical upstream without leaking extra headers', async () => {
    const fetcher = vi.fn<Fetcher>(
      async () =>
        new Response('{"profile":{"trainerName":"Natan"}}', {
          status: 200,
          headers: {
            'cache-control': 'no-store',
            'content-type': 'application/json; charset=utf-8',
          },
        }),
    );
    const request = new Request('https://hub.example.test/api/hub/player/self', {
      headers: {
        accept: 'application/json',
        cookie: '__Host-pokemon_hub_session=session-token',
        'x-do-not-forward': 'secret',
      },
    });

    const response = await proxyPlayerPortalRequest(request, {
      baseUrl,
      upstreamPath: '/v1/hub/player/self',
      allowedMethod: 'GET',
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [input, init] = fetcher.mock.calls[0] ?? [];
    expect(input).toBe('https://player-api.example.test/v1/hub/player/self');
    expect(init).toMatchObject({ method: 'GET' });
    expect(new Headers(init?.headers).get('cookie')).toBe(
      '__Host-pokemon_hub_session=session-token',
    );
    expect(new Headers(init?.headers).get('x-do-not-forward')).toBeNull();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('forwards login exchange JSON and preserves the upstream session cookie', async () => {
    const sessionCookie =
      '__Host-pokemon_hub_session=session-token; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200';
    const fetcher = vi.fn<Fetcher>(
      async () =>
        new Response('{"profile":{"trainerName":"Natan"}}', {
          status: 200,
          headers: {
            'cache-control': 'no-store',
            'content-type': 'application/json; charset=utf-8',
            'set-cookie': sessionCookie,
          },
        }),
    );
    const request = new Request('https://hub.example.test/api/hub/auth/exchange', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticket: 'A'.repeat(43) }),
    });

    const response = await proxyPlayerPortalRequest(request, {
      baseUrl,
      upstreamPath: '/v1/hub/auth/exchange',
      allowedMethod: 'POST',
      fetcher,
    });

    const [input, init] = fetcher.mock.calls[0] ?? [];
    expect(input).toBe('https://player-api.example.test/v1/hub/auth/exchange');
    expect(init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ ticket: 'A'.repeat(43) }),
    });
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
    expect(response.headers.get('set-cookie')).toBe(sessionCookie);
  });

  it('fails closed when no upstream is configured', async () => {
    const fetcher = vi.fn<Fetcher>();
    const request = new Request('https://hub.example.test/api/hub/player/self');

    const response = await proxyPlayerPortalRequest(request, {
      baseUrl: null,
      upstreamPath: '/v1/hub/player/self',
      allowedMethod: 'GET',
      fetcher,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'PLAYER_PORTAL_UNAVAILABLE' });
  });

  it('returns a generic gateway error when the upstream request fails', async () => {
    const fetcher = vi.fn<Fetcher>(async () => {
      throw new Error('private upstream detail');
    });
    const request = new Request('https://hub.example.test/api/hub/player/self');

    const response = await proxyPlayerPortalRequest(request, {
      baseUrl,
      upstreamPath: '/v1/hub/player/self',
      allowedMethod: 'GET',
      fetcher,
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'PLAYER_PORTAL_BAD_GATEWAY' });
  });

  it('rejects methods outside the route contract before contacting the upstream', async () => {
    const fetcher = vi.fn<Fetcher>();
    const request = new Request('https://hub.example.test/api/hub/player/self', {
      method: 'POST',
    });

    const response = await proxyPlayerPortalRequest(request, {
      baseUrl,
      upstreamPath: '/v1/hub/player/self',
      allowedMethod: 'GET',
      fetcher,
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });
});
