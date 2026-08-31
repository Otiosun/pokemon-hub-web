import type { AdminPrepareOperationRequest } from '../../lib/api/admin-api';

const NON_ZERO_INTEGER = /^-?[1-9][0-9]*$/;
const MAX_SAFE_DELTA = BigInt(Number.MAX_SAFE_INTEGER);

export interface TrainerProgressionPrepareContext {
  readonly playerId: string;
  readonly delta: string;
  readonly reason: string;
  readonly idempotencyKey: string;
}

export function buildTrainerProgressionPrepareRequest(
  context: TrainerProgressionPrepareContext,
): AdminPrepareOperationRequest {
  const delta = context.delta.trim();
  const reason = context.reason.trim();

  if (!NON_ZERO_INTEGER.test(delta)) {
    throw new Error('Progression delta must be a non-zero integer.');
  }

  const parsedDelta = BigInt(delta);
  if (parsedDelta < -MAX_SAFE_DELTA || parsedDelta > MAX_SAFE_DELTA) {
    throw new Error('Progression delta is outside the safe integer range.');
  }

  if (reason.length === 0 || reason.length > 2000) {
    throw new Error('Administrative reason is required and must fit the Registry contract.');
  }

  return {
    operationType: 'progression.trainer.adjust',
    input: {
      playerId: context.playerId,
      delta,
    },
    reason,
    idempotencyKey: context.idempotencyKey,
  };
}
