import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient } from './admin-api';

const API = 'https://admin-api.example.com';
const PLAYER_ID = '00000000-0000-4000-8000-000000000444';

function responseWithPokemon(pokemon: readonly unknown[]): Response {
  return new Response(
    JSON.stringify({
      player: {
        id: PLAYER_ID,
        status: 'ACTIVE',
        createdAt: '2026-08-20T12:00:00.000Z',
        updatedAt: '2026-08-30T18:30:00.000Z',
        revision: '14',
      },
      profile: {
        trainerName: 'Lia',
        originRegionId: null,
        locale: 'pt-BR',
        metadata: null,
        revision: '3',
      },
      identities: [],
      onboarding: {
        state: 'COMPLETED',
        completedAt: '2026-08-20T12:15:00.000Z',
        revision: '5',
        contentReleaseId: null,
        rulesetId: null,
      },
      progression: { level: 12, insigniaPoints: '420', revision: '9', unlocks: [] },
      location: null,
      wallets: [],
      inventory: [],
      pokemon,
      pokedex: { speciesSeen: 1, speciesCaught: 1, entries: [] },
      activeEncounter: null,
      activeBattle: null,
      effects: [],
      recentActivity: [],
      unsupportedSections: ['COOLDOWNS', 'PUNISHMENTS_FLAGS'],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

const PIKACHU = {
  id: '00000000-0000-4000-8000-000000000001',
  formId: '00000000-0000-4000-8000-000000000101',
  formSlug: 'pikachu',
  speciesId: '00000000-0000-4000-8000-000000000201',
  speciesSlug: 'pikachu',
  nationalDex: 25,
  nickname: 'Volt',
  level: 18,
  xp: '6200',
  currentHp: 41,
  gender: 'MALE',
  shiny: false,
  status: 'ACTIVE',
  abilityId: '00000000-0000-4000-8000-000000000301',
  abilitySlug: 'static',
  natureId: '00000000-0000-4000-8000-000000000401',
  natureSlug: 'jolly',
  revision: '7',
  createdAt: '2026-08-20T12:30:00.000Z',
  updatedAt: '2026-08-30T12:30:00.000Z',
  placement: { kind: 'TEAM', boxNo: null, slotNo: 1 },
  ivs: { hp: 31, attack: 21, defense: 18, spAttack: 17, spDefense: 22, speed: 30 },
  moves: [
    {
      slotNo: 1,
      moveId: '00000000-0000-4000-8000-000000000501',
      slug: 'thunder-shock',
      ppCurrent: 27,
      learnedAt: '2026-08-21T12:30:00.000Z',
    },
  ],
  persistentConditions: [
    {
      key: 'status:poison',
      sourceType: 'BATTLE',
      sourceId: 'battle:42',
      appliedAt: '2026-08-30T11:00:00.000Z',
      expiresAt: null,
    },
  ],
  evolutionConditionFlags: [
    {
      key: 'evolution:friendship',
      status: 'ACTIVE',
      sourceType: 'SYSTEM',
      sourceId: 'friendship:high',
      grantedAt: '2026-08-29T10:00:00.000Z',
      revokedAt: null,
      revision: '1',
    },
  ],
} as const;

describe('AdminApiClient Player 360 Pokemon contract', () => {
  it('preserves the canonical Team/Box Pokemon diagnostic fields', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(responseWithPokemon([PIKACHU]));
    const client = new AdminApiClient(API, fetchImpl);

    const player = await client.getPlayer(PLAYER_ID, false);

    expect(player.pokemon).toEqual([PIKACHU]);
  });

  it('rejects a malformed Pokemon instead of leaking unknown roster data into the UI', async () => {
    const malformed = { ...PIKACHU, placement: { kind: 'TEAM', boxNo: 4, slotNo: 1 } };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(responseWithPokemon([malformed]));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getPlayer(PLAYER_ID, false)).rejects.toMatchObject({
      code: 'INVALID_PLAYER360_RESPONSE',
    });
  });
});
