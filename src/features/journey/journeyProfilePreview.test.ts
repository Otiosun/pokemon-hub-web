import { describe, expect, it } from 'vitest';
import type { PlayerPortalProfile } from '../../player-api/playerPortalClient';
import { createJourneyProfileView } from './journeyProfilePreview';

const realProfile: PlayerPortalProfile = {
  playerId: '11111111-1111-4111-8111-111111111111',
  playerStatus: 'ACTIVE',
  trainerName: 'Natan',
  originRegionId: '22222222-2222-4222-8222-222222222222',
  originRegionName: 'Kanto',
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
      displayName: 'Charmander',
      nationalDex: 4,
      typeNames: ['Fire'],
      level: 12,
      currentHp: 31,
      slotNo: 1,
    },
    {
      pokemonInstanceId: '88888888-8888-4888-8888-888888888888',
      formId: '99999999-9999-4999-8999-999999999999',
      displayName: 'Pidgey',
      nationalDex: 16,
      typeNames: ['Normal', 'Flying'],
      level: 9,
      currentHp: 24,
      slotNo: 2,
    },
  ],
};

describe('createJourneyProfileView', () => {
  it('uses authoritative trainer and catalog presentation without inventing unsupported world data', () => {
    const profile = createJourneyProfileView(realProfile);

    expect(profile).toMatchObject({
      trainerName: 'Natan',
      trainerTitle: 'Treinador · Nv. 7',
      trainerId: null,
      originRegion: 'Kanto',
      currentLocation: null,
      leadPokemon: {
        instanceId: '66666666-6666-4666-8666-666666666666',
        dex: 4,
        displayName: 'Charmander',
        level: 12,
        types: ['Fire'],
      },
      badges: [],
      ownedPokemonCount: null,
      registeredSpeciesCount: null,
      teamSize: 2,
      progressionPoints: '1234',
    });
    expect(JSON.stringify(profile)).not.toContain('Whatever');
    expect(JSON.stringify(profile)).not.toContain('Route 1');
    expect(JSON.stringify(profile)).not.toContain('Brasa');
  });

  it('projects authoritative journey reads without inventing unsupported profile fields', () => {
    const profile = createJourneyProfileView(realProfile, {
      currentLocation: 'Vila dos Arrozais · Zhoulia',
      ownedPokemonCount: 14,
      registeredSpeciesCount: 9,
    });

    expect(profile).toMatchObject({
      trainerId: null,
      publicVerificationId: null,
      currentLocation: 'Vila dos Arrozais · Zhoulia',
      ownedPokemonCount: 14,
      registeredSpeciesCount: 9,
      badges: [],
      personal: {
        age: null,
        height: null,
        appearance: null,
        bio: null,
      },
    });
  });

  it('does not invent a partner when the catalog presentation is unresolved', () => {
    const profile = createJourneyProfileView({
      ...realProfile,
      team: [
        {
          pokemonInstanceId: '66666666-6666-4666-8666-666666666666',
          formId: '77777777-7777-4777-8777-777777777777',
          displayName: null,
          nationalDex: null,
          typeNames: [],
          level: 12,
          currentHp: 31,
          slotNo: 1,
        },
      ],
    });

    expect(profile.leadPokemon).toBeNull();
  });

  it('renders an honest disconnected shell instead of falling back to preview trainer data', () => {
    const profile = createJourneyProfileView(null);

    expect(profile).toMatchObject({
      trainerName: 'Treinador',
      trainerTitle: 'Registro não conectado',
      trainerId: null,
      originRegion: null,
      currentLocation: null,
      leadPokemon: null,
      badges: [],
      teamSize: null,
      progressionPoints: null,
    });
  });
});
