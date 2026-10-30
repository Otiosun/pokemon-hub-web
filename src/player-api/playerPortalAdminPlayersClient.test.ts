import { describe, expect, it } from 'vitest';
import {
  adjustAdminPlayer,
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
    expect(await searchAdminPlayers({}, () => jsonResponse(403, { error: 'FORBIDDEN' }))).toEqual({
      status: 'forbidden',
    });
  });

  it('parses an authorized player search page', async () => {
    const result = await searchAdminPlayers({ query: 'Nat', status: 'ACTIVE', limit: 25 }, () =>
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

  it('posts audited adjustments with the caller request id and parses APPLIED evidence', async () => {
    const requestId = '22222222-2222-4222-8222-222222222222';
    let requestUrl = '';
    let requestInit: RequestInit | undefined;

    const result = await adjustAdminPlayer(
      playerId,
      {
        requestId,
        kind: 'PROGRESSION',
        delta: '50',
        reason: 'Restore missing event progress',
      },
      (url, init) => {
        requestUrl = String(url);
        requestInit = init;
        return jsonResponse(200, {
          operationId: '33333333-3333-4333-8333-333333333333',
          status: 'APPLIED',
          replayed: false,
          result: { afterPoints: 150 },
        });
      },
    );

    expect(requestUrl).toBe(`/api/hub/admin/players/${playerId}/adjustments`);
    expect(requestInit?.method).toBe('POST');
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      requestId,
      kind: 'PROGRESSION',
      delta: '50',
      reason: 'Restore missing event progress',
    });
    expect(result).toEqual({
      status: 'ok',
      operationId: '33333333-3333-4333-8333-333333333333',
      replayed: false,
      result: { afterPoints: 150 },
    });
  });

  it('returns administrative rejections without pretending the adjustment succeeded', async () => {
    const result = await adjustAdminPlayer(
      playerId,
      {
        requestId: '22222222-2222-4222-8222-222222222222',
        kind: 'WALLET',
        currencyId: '33333333-3333-4333-8333-333333333333',
        delta: '-999',
        reason: 'Correction',
      },
      () => jsonResponse(409, { error: 'ADMIN_DOMAIN_OPERATION_REJECTED' }),
    );

    expect(result).toEqual({
      status: 'rejected',
      code: 'ADMIN_DOMAIN_OPERATION_REJECTED',
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
