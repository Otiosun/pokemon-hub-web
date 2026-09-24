import { describe, expect, it, vi } from 'vitest';
import { handleCloudflareUatRequest } from './cloudflareUatWorker';

const UAT_HOST = 'feat-player-api-v1-pokemon-hub-web.natanaelgames19.workers.dev';

function assetsFetcher() {
  return {
    fetch: vi.fn(async () => new Response('asset', { status: 200 })),
  };
}

describe('Cloudflare UAT Hub worker', () => {
  it('proxies Hub API requests only on the canonical UAT branch alias', async () => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        'https://stadium-mathematics-disks-honolulu.trycloudflare.com/v1/hub/player/self',
      );
      expect(init?.method).toBe('GET');
      return new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    });

    const response = await handleCloudflareUatRequest(
      new Request(`https://${UAT_HOST}/api/hub/player/self`),
      { ASSETS: assets },
      upstream,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' });
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('proxies the read-only Journey location without exposing gameplay actions', async () => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        'https://stadium-mathematics-disks-honolulu.trycloudflare.com/v1/hub/player/location',
      );
      expect(init?.method).toBe('GET');
      return new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    });

    const response = await handleCloudflareUatRequest(
      new Request(`https://${UAT_HOST}/api/hub/player/location`),
      { ASSETS: assets },
      upstream,
    );

    expect(response.status).toBe(401);
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('proxies authenticated profile customization without exposing gameplay mutation routes', async () => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        'https://stadium-mathematics-disks-honolulu.trycloudflare.com/v1/hub/player/profile-customization',
      );
      expect(init?.method).toBe('PUT');
      return new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    });

    const response = await handleCloudflareUatRequest(
      new Request(`https://${UAT_HOST}/api/hub/player/profile-customization`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: null,
          bio: null,
          appearance: null,
          age: null,
          height: null,
          accent: 'crimson',
        }),
      }),
      { ASSETS: assets },
      upstream,
    );

    expect(response.status).toBe(401);
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('never exposes staging Hub API from non-UAT hosts', async () => {
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

  it('delegates non-Hub routes to static assets', async () => {
    const assets = assetsFetcher();
    const upstream = vi.fn(async () => new Response('unexpected'));
    const request = new Request(`https://${UAT_HOST}/pokedex`);

    const response = await handleCloudflareUatRequest(request, { ASSETS: assets }, upstream);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('asset');
    expect(assets.fetch).toHaveBeenCalledWith(request);
    expect(upstream).not.toHaveBeenCalled();
  });
});
