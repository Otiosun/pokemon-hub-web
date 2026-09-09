import { describe, expect, it } from 'vitest';
import type { PlayerPortalProfile } from '../../player-api/playerPortalClient';
import { createTeamProfileView } from './teamProfileView';

const profile: PlayerPortalProfile = {
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
      pokemonInstanceId: '77777777-7777-4777-8777-777777777777',
      formId: '88888888-8888-4888-8888-888888888888',
      displayName: null,
      nationalDex: null,
      typeNames: [],
      level: 9,
      currentHp: 18,
      slotNo: 3,
    },
    {
      pokemonInstanceId: '55555555-5555-4555-8555-555555555555',
      formId: '66666666-6666-4666-8666-666666666666',
      displayName: 'Charmander',
      nationalDex: 4,
      typeNames: ['Fire'],
      level: 12,
      currentHp: 31,
      slotNo: 1,
    },
  ],
};

describe('createTeamProfileView', () => {
  it('maps authoritative team slots without inventing nickname, favorite or shiny state', () => {
    expect(createTeamProfileView(profile)).toEqual([
      {
        instanceId: '55555555-5555-4555-8555-555555555555',
        displayName: 'Charmander',
        dex: 4,
        types: ['Fire'],
        level: 12,
        currentHp: 31,
        slotNo: 1,
        catalogResolved: true,
      },
      {
        instanceId: '77777777-7777-4777-8777-777777777777',
        displayName: 'REGISTRO INDISPONÍVEL',
        dex: null,
        types: [],
        level: 9,
        currentHp: 18,
        slotNo: 3,
        catalogResolved: false,
      },
    ]);
  });

  it('returns an empty team when no authenticated profile is available', () => {
    expect(createTeamProfileView(null)).toEqual([]);
  });
});
