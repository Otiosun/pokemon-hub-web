import { describe, expect, it } from 'vitest';
import {
  getAdminPlayer,
  searchAdminPlayers,
} from './playerPortalAdminPlayersClient';

const playerId = '11111111-1111-4111-8111-111111111111';

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('Player 360 admin client', () => {
  it('keeps normal authenticated users outside Player 360', async () => {
    expect(
      await searchAdminPlayers({}, () => jsonResponse(403, { error: 'FORBIDDEN' })),
    ).toEqual({ status: 'forbidden' });
  });

  it('parses an authorized player search page', async () => {
    const result = await searchAdminPlayers(
      { query: 'Nat', status: 'ACTIVE', limit: 25 },
      () =>
        jsonResponse(200, {
          players: [
            {
              playerId,
              status: 'ACTIVE',
              trainerName: 'Natan',
              originRegionId: null,
              trainerLevel: 7,
              insigniaPoints: '1234',
              areaId: null,
              activeEncounterId: null,
              activeEncounterStatus: null,
              activeBattleId: null,
              activeBattleStatus: null,
              identities: [],
              createdAt: '2026-09-23T10:00:00.000Z',
            },
          ],
          nextCursor: null,
        }),
    );

    expect(result).toEqual({
      status: 'ok',
      players: [
        expect.objectContaining({
          playerId,
          trainerName: 'Natan',
          trainerLevel: 7,
        }),
      ],
      nextCursor: null,
    });
  });

  it('rejects malformed Player 360 payloads instead of trusting browser data', async () => {
    await expect(
      getAdminPlayer(playerId, () =>
        jsonResponse(200, {
          player: {
            player: { id: 'not-a-uuid', status: 'ACTIVE' },
          },
        }),
      ),
    ).rejects.toThrow('Invalid admin player detail response');
  });
});
