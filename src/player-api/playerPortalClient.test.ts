import { describe, expect, it, vi } from 'vitest';
import { getPlayerPortalSelf } from './playerPortalClient';

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
  team: [
    {
      pokemonInstanceId: '66666666-6666-4666-8666-666666666666',
      formId: '77777777-7777-4777-8777-777777777777',
      level: 12,
      currentHp: 31,
      slotNo: 1,
    },
  ],
};

describe('getPlayerPortalSelf', () => {
  it(
    'reads the current player through the same-origin BFF with credentials included',
    async () => {
      const fetcher = vi.fn(async () =>
        new Response(JSON.stringify({ profile }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const result = await getPlayerPortalSelf(fetcher);

      expect(fetcher).toHaveBeenCalledWith('/api/hub/player/self', {
        method: 'GET',
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
      expect(result).toEqual({ status: 'authenticated', profile });
    },
  );

  it(
    'returns an explicit unauthenticated state for 401 without fabricating profile data',
    async () => {
      const fetcher = vi.fn(
        async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }),
      );

      await expect(getPlayerPortalSelf(fetcher)).resolves.toEqual({ status: 'unauthenticated' });
    },
  );

  it('rejects malformed successful payloads instead of trusting arbitrary JSON', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ profile: { trainerName: 'Whatever' } }), { status: 200 }),
    );

    await expect(getPlayerPortalSelf(fetcher)).rejects.toThrow('Invalid player portal response');
  });

  it('rejects non-authentication HTTP failures as API errors', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"INTERNAL_ERROR"}', { status: 503 }));

    await expect(getPlayerPortalSelf(fetcher)).rejects.toThrow(
      'Player portal request failed (503)',
    );
  });
});
