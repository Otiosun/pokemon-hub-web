import type { AdminPrepareOperationRequest } from '../../lib/api/admin-api';

export interface BattleForceCancelPrepareContext {
  readonly playerId: string;
  readonly battleId: string;
  readonly battleVersion: string;
  readonly reason: string;
  readonly idempotencyKey: string;
}

function normalizedReason(reason: string): string {
  const normalized = reason.trim();
  if (normalized.length === 0 || normalized.length > 2000) {
    throw new Error('Battle force-cancel reason is invalid.');
  }
  return normalized;
}

function normalizedRevision(version: string): string {
  if (!/^(0|[1-9]\d*)$/.test(version)) {
    throw new Error('Battle force-cancel revision is invalid.');
  }
  return version;
}

function normalizedIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 128) {
    throw new Error('Battle force-cancel idempotency key is invalid.');
  }
  return normalized;
}

export function buildBattleForceCancelPrepareRequest(
  context: BattleForceCancelPrepareContext,
): AdminPrepareOperationRequest {
  return {
    operationType: 'battle.force_cancel',
    input: {
      playerId: context.playerId,
      battleId: context.battleId,
    },
    reason: normalizedReason(context.reason),
    expectedRevision: normalizedRevision(context.battleVersion),
    idempotencyKey: normalizedIdempotencyKey(context.idempotencyKey),
  };
}
