import { describe, expect, it, vi } from 'vitest';
import type { PlayerPortalProfile, PlayerPortalProfileCustomization } from './playerPortalClient';
import { updatePlayerPortalProfileCustomization } from './playerPortalProfileCustomizationClient';

const customization: PlayerPortalProfileCustomization = {
  title: 'Explorador',
  bio: 'Sempre seguindo a próxima trilha.',
  appearance: null,
  age: 29,
  height: '1,94 m',
  accent: 'gold',
};

const profile: PlayerPortalProfile = {
  playerId: '11111111-1111-4111-8111-111111111111',
  playerStatus: 'ACTIVE',
  trainerName: 'Natan',
  originRegionId: '22222222-2222-4222-8222-222222222222',
  originRegionName: 'Zhoulia',
  locale: 'pt-BR',
  trainerLevel: 7,
  progressionPoints: '1234',
  onboardingState: 'COMPLETE',
  contentReleaseId: '33333333-3333-4333-8333-333333333333',
  rulesetId: '44444444-4444-4444-8444-444444444444',
  starterPokemonInstanceId: null,
  profileCustomization: customization,
  team: [],
};

describe('updatePlayerPortalProfileCustomization', () => {
  it('saves cosmetic profile data through the same-origin BFF', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ profile }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(
      updatePlayerPortalProfileCustomization(customization, fetcher, false),
    ).resolves.toEqual({ status: 'authenticated', profile });

    expect(fetcher).toHaveBeenCalledWith('/api/hub/player/profile-customization', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(customization),
    });
  });

  it('does not pretend a profile update succeeded after session expiry', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }));

    await expect(
      updatePlayerPortalProfileCustomization(customization, fetcher, false),
    ).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('rejects malformed successful profile payloads', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ profile: { ...profile, profileCustomization: { accent: 'pink' } } }),
          {
            status: 200,
          },
        ),
    );

    await expect(
      updatePlayerPortalProfileCustomization(customization, fetcher, false),
    ).rejects.toThrow('Invalid player portal profile response');
  });
});
