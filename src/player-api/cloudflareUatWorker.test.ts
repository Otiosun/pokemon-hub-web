import { describe, expect, it, vi } from 'vitest';
import { handleCloudflareUatRequest } from './cloudflareUatWorker';

const PREVIEW_HOST =
  'candidate-hub-player-portal-v43b-20260924-pokemon-hub-web.natanaelgames19.workers.dev';

function assetsFetcher() {
  return {
    fetch: vi.fn(async () => new Response('asset', { status: 200 })),
  };
}

describe('Cloudflare UAT Hub worker', () => {
  it.each([
    ['/api/hub/player/self', '/v1/hub/player/self'],
    ['/api/hub/player/pokemon', '/v1/hub/player/pokemon'],
    ['/api/hub/player/pokedex', '/v1/hub/player/pokedex'],
    ['/api/hub/player/inventory', '/v1/hub/player/inventory'],
    ['/api/hub/player/battle', '/v1/hub/player/battle'],
    ['/api/hub/player/move-choices', '/v1/hub/player/move-choices'],
  ])('proxies read route %s to %s', async (publicPath, upstreamPath) => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`https://pokemon-api.otiosunbots.xyz${upstreamPath}`);
      expect(init?.method).toBe('GET');
      return new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    });

    const response = await handleCloudflareUatRequest(
      new Request(`https://${PREVIEW_HOST}${publicPath}`),
      { ASSETS: assets },
      upstream,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' });
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('proxies Hub ticket exchange to the named Player Portal tunnel', async () => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://pokemon-api.otiosunbots.xyz/v1/hub/auth/exchange');
      expect(init?.method).toBe('POST');
      return new Response(JSON.stringify({ error: 'INVALID_TICKET' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    });

    const response = await handleCloudflareUatRequest(
      new Request(`https://${PREVIEW_HOST}/api/hub/auth/exchange`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ticket: 'single-use-ticket' }),
      }),
      { ASSETS: assets },
      upstream,
    );

    expect(response.status).toBe(401);
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('maps Journey location to the V23 world location route', async () => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://pokemon-api.otiosunbots.xyz/v1/hub/world/location');
      expect(init?.method).toBe('GET');
      return new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    });

    const response = await handleCloudflareUatRequest(
      new Request(`https://${PREVIEW_HOST}/api/hub/player/location`),
      { ASSETS: assets },
      upstream,
    );

    expect(response.status).toBe(401);
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['/api/hub/player/roster', '/v1/hub/player/roster', 'PUT'],
    [
      '/api/hub/player/profile-customization',
      '/v1/hub/player/profile-customization',
      'PUT',
    ],
    [
      '/api/hub/player/move-choices/resolve',
      '/v1/hub/player/move-choices/resolve',
      'POST',
    ],
  ])('proxies explicitly allowlisted mutation route %s', async (publicPath, upstreamPath, method) => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`https://pokemon-api.otiosunbots.xyz${upstreamPath}`);
      expect(init?.method).toBe(method);
      return new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    });

    const response = await handleCloudflareUatRequest(
      new Request(`https://${PREVIEW_HOST}${publicPath}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      { ASSETS: assets },
      upstream,
    );

    expect(response.status).toBe(401);
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('rejects Hub API access from the production workers.dev host', async () => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async () => new Response('unexpected'));

    const response = await handleCloudflareUatRequest(
      new Request('https://pokemon-hub-web.natanaelgames19.workers.dev/api/hub/player/self'),
      { ASSETS: assets },
      upstream,
    );

    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('does not expose non-allowlisted Hub routes on preview hosts', async () => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async () => new Response('unexpected'));

    const response = await handleCloudflareUatRequest(
      new Request(`https://${PREVIEW_HOST}/api/hub/admin/players`),
      { ASSETS: assets },
      upstream,
    );

    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('delegates non-Hub routes to static assets', async () => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async () => new Response('unexpected'));
    const request = new Request(`https://${PREVIEW_HOST}/pokedex`);

    const response = await handleCloudflareUatRequest(request, { ASSETS: assets }, upstream);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('asset');
    expect(assets.fetch).toHaveBeenCalledWith(request);
    expect(upstream).not.toHaveBeenCalled();
  });
});
