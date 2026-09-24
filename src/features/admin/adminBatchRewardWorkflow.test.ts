import { describe, expect, it, vi } from 'vitest';
import type { AdminOperationMutationResult } from '../../player-api/playerPortalAdminOperationsClient';
import {
  buildBatchRewardExecuteRequest,
  buildBatchRewardPreviewRequest,
  runBatchRewardExecution,
  runBatchRewardPreview,
} from './adminBatchRewardWorkflow';

const requestId = '11111111-1111-4111-8111-111111111111';
const playerId = '22222222-2222-4222-8222-222222222222';
const batchId = '33333333-3333-4333-8333-333333333333';
const operationId = '44444444-4444-4444-8444-444444444444';

function ok(
  operationStatus: Extract<AdminOperationMutationResult, { status: 'ok' }>['operationStatus'],
  result: Record<string, unknown> | null = null,
): Extract<AdminOperationMutationResult, { status: 'ok' }> {
  return {
    status: 'ok',
    operationId,
    operationStatus,
    result,
    replayed: false,
  };
}

describe('admin batch reward workflow', () => {
  it('builds a strict selected-player progression preview', () => {
    expect(
      buildBatchRewardPreviewRequest({
        requestId,
        target: { kind: 'PLAYER_IDS', playerIds: [playerId, playerId] },
        delta: '50',
        reason: 'Evento semanal',
      }),
    ).toEqual({
      ok: true,
      request: {
        requestId,
        operationType: 'batch.preview',
        input: {
          selector: { kind: 'PLAYER_IDS', playerIds: [playerId] },
          action: { kind: 'TRAINER_PROGRESSION_ADJUST', delta: '50' },
          chunkSize: 25,
        },
        reason: 'Evento semanal',
      },
    });
  });

  it('builds a status-filter preview and rejects zero/no-target payloads', () => {
    expect(
      buildBatchRewardPreviewRequest({
        requestId,
        target: { kind: 'PLAYER_FILTER', status: 'ACTIVE' },
        delta: '-10',
        reason: 'Correção',
      }),
    ).toMatchObject({
      ok: true,
      request: {
        operationType: 'batch.preview',
        input: {
          selector: { kind: 'PLAYER_FILTER', status: 'ACTIVE', limit: 1000 },
        },
      },
    });

    expect(
      buildBatchRewardPreviewRequest({
        requestId,
        target: { kind: 'PLAYER_IDS', playerIds: [] },
        delta: '10',
        reason: 'Evento',
      }),
    ).toEqual({ ok: false, message: 'Selecione pelo menos um jogador.' });

    expect(
      buildBatchRewardPreviewRequest({
        requestId,
        target: { kind: 'PLAYER_IDS', playerIds: [playerId] },
        delta: '0',
        reason: 'Evento',
      }),
    ).toEqual({ ok: false, message: 'Informe um delta inteiro diferente de zero.' });
  });

  it('runs preview READY -> APPLIED and validates the immutable snapshot result', async () => {
    const prepare = vi.fn(async () => ok('READY'));
    const advance = vi.fn(async (_id: string, action: string) => {
      expect(action).toBe('apply');
      return ok('APPLIED', {
        batchId,
        childOperationType: 'progression.trainer.adjust',
        targetCount: 12,
        estimatedChunks: 1,
        chunkSize: 25,
        revision: '0',
        sampleTargetIds: [playerId],
      });
    });

    const built = buildBatchRewardPreviewRequest({
      requestId,
      target: { kind: 'PLAYER_IDS', playerIds: [playerId] },
      delta: '25',
      reason: 'Recompensa',
    });
    if (!built.ok) throw new Error(built.message);

    await expect(runBatchRewardPreview(built.request, { prepare, advance })).resolves.toEqual({
      status: 'applied',
      operationId,
      value: {
        batchId,
        targetCount: 12,
        estimatedChunks: 1,
        chunkSize: 25,
        revision: '0',
        sampleTargetIds: [playerId],
      },
    });
  });

  it('requires confirmation before executing the previewed batch', async () => {
    const prepare = vi.fn(async () => ok('PENDING_CONFIRMATION'));
    const advance = vi
      .fn()
      .mockResolvedValueOnce(ok('READY'))
      .mockResolvedValueOnce(
        ok('APPLIED', {
          batchId,
          status: 'COMPLETED',
          targetCount: 12,
          successCount: 12,
          failureCount: 0,
          checkpointOrdinal: 12,
          revision: '1',
          replayed: false,
          failures: [],
        }),
      );

    const built = buildBatchRewardExecuteRequest({
      requestId,
      preview: {
        batchId,
        targetCount: 12,
        estimatedChunks: 1,
        chunkSize: 25,
        revision: '0',
        sampleTargetIds: [playerId],
      },
      reason: 'Recompensa',
    });
    if (!built.ok) throw new Error(built.message);

    const result = await runBatchRewardExecution(built.request, { prepare, advance });
    expect(advance).toHaveBeenNthCalledWith(1, operationId, 'confirm');
    expect(advance).toHaveBeenNthCalledWith(2, operationId, 'apply');
    expect(result).toMatchObject({
      status: 'applied',
      value: {
        status: 'COMPLETED',
        successCount: 12,
        failureCount: 0,
      },
    });
  });
});
