import { describe, expect, it, vi } from 'vitest';
import type { AdminPlayer360 } from '../../player-api/playerPortalAdminPlayersClient';
import {
  buildAdminRepairOperation,
  runAdminRepairOperation,
} from './adminRepairOperationWorkflow';

const playerId = '11111111-1111-4111-8111-111111111111';
const battleId = '22222222-2222-4222-8222-222222222222';
const encounterId = '33333333-3333-4333-8333-333333333333';
const operationId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';

const battle = {
  id: battleId,
  status: 'ACTIVE',
  battleType: 'WILD',
  encounterId,
  turnNumber: 3,
  version: '7',
  createdAt: '2026-09-23T10:00:00.000Z',
  updatedAt: '2026-09-23T10:01:00.000Z',
  endedAt: null,
} satisfies NonNullable<AdminPlayer360['activeBattle']>;

const encounter = {
  id: encounterId,
  status: 'PRESENTED',
  areaId: '66666666-6666-4666-8666-666666666666',
  revision: '4',
  createdAt: '2026-09-23T09:00:00.000Z',
  updatedAt: '2026-09-23T09:01:00.000Z',
} satisfies NonNullable<AdminPlayer360['activeEncounter']>;

describe('Central ADM repair workflow', () => {
  it('binds battle cancellation to the current battle version', () => {
    expect(
      buildAdminRepairOperation({
        action: 'BATTLE_CANCEL',
        playerId,
        activeBattle: battle,
        activeEncounter: encounter,
        reason: 'Recover stuck battle',
        requestId,
      }),
    ).toEqual({
      ok: true,
      request: {
        requestId,
        operationType: 'battle.force_cancel',
        input: { playerId, battleId },
        reason: 'Recover stuck battle',
        expectedRevision: '7',
      },
    });
  });

  it('binds encounter close to the current encounter revision', () => {
    expect(
      buildAdminRepairOperation({
        action: 'ENCOUNTER_CLOSE',
        playerId,
        activeBattle: null,
        activeEncounter: encounter,
        reason: 'Close abandoned encounter',
        requestId,
      }),
    ).toEqual({
      ok: true,
      request: {
        requestId,
        operationType: 'encounter.close',
        input: { playerId, encounterId },
        reason: 'Close abandoned encounter',
        expectedRevision: '4',
      },
    });
  });

  it('blocks PVP force-cancel and unsafe encounter close before sending a mutation', () => {
    expect(
      buildAdminRepairOperation({
        action: 'BATTLE_CANCEL',
        playerId,
        activeBattle: { ...battle, battleType: 'PVP' },
        activeEncounter: encounter,
        reason: 'test',
        requestId,
      }).ok,
    ).toBe(false);

    expect(
      buildAdminRepairOperation({
        action: 'ENCOUNTER_CLOSE',
        playerId,
        activeBattle: battle,
        activeEncounter: { ...encounter, status: 'IN_BATTLE' },
        reason: 'test',
        requestId,
      }).ok,
    ).toBe(false);
  });

  it('drives R3 repair through confirmation before apply', async () => {
    const prepare = vi.fn(async () => ({
      status: 'ok' as const,
      operationId,
      operationStatus: 'PENDING_CONFIRMATION' as const,
      replayed: false,
      result: null,
    }));
    const advance = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'ok' as const,
        operationId,
        operationStatus: 'READY' as const,
        result: null,
      })
      .mockResolvedValueOnce({
        status: 'ok' as const,
        operationId,
        operationStatus: 'APPLIED' as const,
        result: { repaired: true },
      });

    const built = buildAdminRepairOperation({
      action: 'BATTLE_CANCEL',
      playerId,
      activeBattle: battle,
      activeEncounter: encounter,
      reason: 'Recover stuck battle',
      requestId,
    });
    if (!built.ok) throw new Error(built.message);

    await expect(
      runAdminRepairOperation(built.request, { prepare, advance }),
    ).resolves.toEqual({
      status: 'applied',
      operationId,
      result: { repaired: true },
    });
    expect(advance).toHaveBeenNthCalledWith(1, operationId, 'confirm');
    expect(advance).toHaveBeenNthCalledWith(2, operationId, 'apply');
  });
});
