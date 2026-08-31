import type { AdminPrepareOperationRequest } from '../../lib/api/admin-api';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NON_ZERO_INTEGER = /^-?[1-9][0-9]*$/;
const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

export interface InventoryAdjustPrepareContext {
  readonly playerId: string;
  readonly itemId: string;
  readonly delta: string;
  readonly reason: string;
  readonly idempotencyKey: string;
}

export function buildInventoryAdjustPrepareRequest(
  context: InventoryAdjustPrepareContext,
): AdminPrepareOperationRequest {
  const delta = context.delta.trim();
  const reason = context.reason.trim();

  if (!UUID_PATTERN.test(context.playerId) || !UUID_PATTERN.test(context.itemId)) {
    throw new Error('Inventory adjustment target must come from validated Player 360 inventory.');
  }

  if (!NON_ZERO_INTEGER.test(delta)) {
    throw new Error('Inventory delta must be a non-zero integer.');
  }

  const parsedDelta = BigInt(delta);
  if (parsedDelta < -MAX_POSTGRES_BIGINT || parsedDelta > MAX_POSTGRES_BIGINT) {
    throw new Error('Inventory delta is outside the PostgreSQL bigint range.');
  }

  if (reason.length === 0 || reason.length > 2000) {
    throw new Error('Administrative reason is required and must fit the Registry contract.');
  }

  if (context.idempotencyKey.trim().length === 0) {
    throw new Error('Idempotency key is required.');
  }

  return {
    operationType: 'inventory.adjust',
    input: {
      playerId: context.playerId,
      itemId: context.itemId,
      delta,
    },
    reason,
    idempotencyKey: context.idempotencyKey,
  };
}
