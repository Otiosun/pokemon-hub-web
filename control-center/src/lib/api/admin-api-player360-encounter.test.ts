import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient } from './admin-api';

const API = 'https://admin-api.example.com';
const PLAYER_ID = '00000000-0000-4000-8000-000000000444';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function player360WithEncounter(revision: unknown) {
  return {
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
      contentReleaseId: '00000000-0000-4000-8000-000000000501',
      rulesetId: '00000000-0000-4000-8000-000000000601',
    },
    progression: {
      level: 12,
      insigniaPoints: '420',
      revision: '9',
      unlocks: [],
    },
    location: null,
    wallets: [],
    inventory: [],
    pokemon: [],
    pokedex: { speciesSeen: 0, speciesCaught: 0, entries: [] },
    activeEncounter: {
      id: '00000000-0000-4000-8000-000000000777',
      status: 'ENGAGED',
      areaId: '00000000-0000-4000-8000-000000000150',
      contentReleaseId: '00000000-0000-4000-8000-000000000501',
      rulesetId: '00000000-0000-4000-8000-000000000601',
      revision,
      createdAt: '2026-08-31T10:00:00.000Z',
      updatedAt: '2026-08-31T10:05:00.000Z',
    },
    activeBattle: null,
    effects: [],
    recentActivity: [],
    unsupportedSections: ['COOLDOWNS', 'PUNISHMENTS_FLAGS'],
  };
}

describe('AdminApiClient Player 360 encounter contract', () => {
  it('rejects an active encounter whose authoritative revision is not a non-negative integer string', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(player360WithEncounter('stale?')));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getPlayer(PLAYER_ID, false)).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_PLAYER360_RESPONSE',
    });
  });
});
