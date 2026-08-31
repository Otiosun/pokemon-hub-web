import { describe, expect, it } from 'vitest';
import { buildBattleForceCancelPrepareRequest } from './battle-force-cancel-prepare';

const PLAYER_ID = '11111111-1111-4111-8111-111111111111';
const BATTLE_ID = '22222222-2222-4222-8222-222222222222';

describe('battle.force_cancel prepare-only request', () => {
  it('derives target and expected revision from the selected Player 360 context', () => {
    const request = buildBattleForceCancelPrepareRequest({
      playerId: PLAYER_ID,
      battleId: BATTLE_ID,
      battleVersion: '7',
      reason: 'Batalha travada após falha operacional.',
      idempotencyKey: 'battle-cancel:33333333-3333-4333-8333-333333333333',
    });

    expect(request).toEqual({
      operationType: 'battle.force_cancel',
      input: { playerId: PLAYER_ID, battleId: BATTLE_ID },
      reason: 'Batalha travada após falha operacional.',
      expectedRevision: '7',
      idempotencyKey: 'battle-cancel:33333333-3333-4333-8333-333333333333',
    });
    expect(Object.keys(request.input)).toEqual(['playerId', 'battleId']);
  });

  it('fails closed before HTTP when reason or battle revision is invalid', () => {
    expect(() =>
      buildBattleForceCancelPrepareRequest({
        playerId: PLAYER_ID,
        battleId: BATTLE_ID,
        battleVersion: '7',
        reason: '   ',
        idempotencyKey: 'battle-cancel:44444444-4444-4444-8444-444444444444',
      }),
    ).toThrow('reason');

    expect(() =>
      buildBattleForceCancelPrepareRequest({
        playerId: PLAYER_ID,
        battleId: BATTLE_ID,
        battleVersion: '7.2',
        reason: 'Correção operacional.',
        idempotencyKey: 'battle-cancel:55555555-5555-4555-8555-555555555555',
      }),
    ).toThrow('revision');
  });
});
