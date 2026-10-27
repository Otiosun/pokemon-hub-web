import { afterEach, describe, expect, it, vi } from 'vitest';
import adminHandler from '../../api/hub/admin/[...path]';
import playerHandler from '../../api/hub/player/[...path]';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Premium staging transport never falls back to production', () => {
  it('blocks obsolete payment mutations in production without invoking an upstream', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', 'https://stage.example.org');
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', 'https://stage.example.org');
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
    const upstream = vi.fn(async () => new Response('unexpected'));
    vi.stubGlobal('fetch', upstream);

    const checkout = await playerHandler.fetch(
      new Request('https://hub.example.org/api/hub/player/premium/orders', {
        method: 'POST',
        body: '{}',
      }),
    );
    const approval = await adminHandler.fetch(
      new Request(
        'https://hub.example.org/api/hub/admin/premium/orders/22222222-2222-4222-8222-222222222222/approve',
        { method: 'POST', body: '{}' },
      ),
    );

    expect(checkout.status).toBe(404);
    expect(approval.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('refuses preview requests when stage backend or explicit approval is absent', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', 'https://pokemon-api.otiosunbots.xyz');
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
    const upstream = vi.fn(async () => new Response('unexpected'));
    vi.stubGlobal('fetch', upstream);

    const result = await playerHandler.fetch(
      new Request('https://hub.example.org/api/hub/player/premium/orders', {
        method: 'POST',
        body: '{}',
      }),
    );
    expect(result.status).toBe(404);
    // A genuinely supported manual grant still fails closed without the
    // approved staging origin (never falls back to the normal Player API).
    const master = await adminHandler.fetch(
      new Request('https://hub.example.org/api/hub/admin/premium/delivery/packs/master', {
        method: 'GET',
      }),
    );
    expect(master.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });
});
