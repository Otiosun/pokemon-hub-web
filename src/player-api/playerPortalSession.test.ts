import { describe, expect, it, vi } from 'vitest';
import { bootstrapPlayerPortalSession } from './playerPortalSession';

const ticket = 'A'.repeat(43);
const profile = {
  playerId: '11111111-1111-4111-8111-111111111111',
  playerStatus: 'ACTIVE',
  trainerName: 'Natan',
  originRegionId: '22222222-2222-4222-8222-222222222222',
  locale: 'pt-BR',
  trainerLevel: 7,
  progressionPoints: '1234',
  onboardingState: 'COMPLETE',
  contentReleaseId: '33333333-3333-4333-8333-333333333333',
  rulesetId: '44444444-4444-4444-8444-444444444444',
  starterPokemonInstanceId: '55555555-5555-4555-8555-555555555555',
  team: [],
};

describe('bootstrapPlayerPortalSession', () => {
  it('restores an existing authenticated session when no ticket is supplied', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ profile }), { status: 200 }));

    await expect(bootstrapPlayerPortalSession(null, fetcher)).resolves.toEqual({
      status: 'authenticated',
      source: 'session',
      profile,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/hub/player/self');
  });

  it('uses a supplied ticket instead of probing a potentially unrelated existing session', async () => {
    const sessionExpiresAt = '2026-09-10T00:00:00.000Z';
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ profile, sessionExpiresAt }), { status: 200 }),
    );

    await expect(bootstrapPlayerPortalSession(ticket, fetcher)).resolves.toEqual({
      status: 'authenticated',
      source: 'ticket',
      profile,
      sessionExpiresAt,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/hub/auth/exchange');
  });

  it('does not fall back to another browser session when the supplied ticket is invalid', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }));

    await expect(bootstrapPlayerPortalSession(ticket, fetcher)).resolves.toEqual({
      status: 'invalid_ticket',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('preserves the explicit unauthenticated state when no browser session exists', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }));

    await expect(bootstrapPlayerPortalSession(null, fetcher)).resolves.toEqual({
      status: 'unauthenticated',
    });
  });
});
