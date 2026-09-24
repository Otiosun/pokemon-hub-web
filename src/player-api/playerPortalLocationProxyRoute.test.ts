import { afterEach, describe, expect, it, vi } from 'vitest';
import locationRoute from '../../api/hub/player/location';

const originalBaseUrl = process.env.PLAYER_PORTAL_API_BASE_URL;

afterEach(() => {
  vi.unstubAllGlobals();

  if (originalBaseUrl === undefined) {
    delete process.env.PLAYER_PORTAL_API_BASE_URL;
  } else {
    process.env.PLAYER_PORTAL_API_BASE_URL = originalBaseUrl;
  }
});

describe('Hub location proxy contract', () => {
  it('targets the V23 canonical world location route', async () => {
    process.env.PLAYER_PORTAL_API_BASE_URL = 'https://player-api.example.test';

    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            location: null,
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
    );

    vi.stubGlobal('fetch', fetcher);

    const response = await locationRoute.fetch(
      new Request('https://hub.example.test/api/hub/player/location', {
        method: 'GET',
        headers: {
          accept: 'application/json',
          cookie: '__Host-pokemon_hub_session=session-token',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const [input, init] = fetcher.mock.calls[0] ?? [];
    expect(input).toBe('https://player-api.example.test/v1/hub/world/location');
    expect(init).toMatchObject({ method: 'GET' });
    expect(new Headers(init?.headers).get('cookie')).toBe(
      '__Host-pokemon_hub_session=session-token',
    );
  });
});
