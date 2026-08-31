import type { AdminPrepareOperationRequest } from '../../lib/api/admin-api';

export interface EncounterClosePrepareContext {
  readonly playerId: string;
  readonly encounterId: string;
  readonly encounterRevision: string;
  readonly reason: string;
  readonly idempotencyKey: string;
}

function normalizedReason(reason: string): string {
  const normalized = reason.trim();
  if (normalized.length === 0 || normalized.length > 2000) {
    throw new Error('Encounter close reason is invalid.');
  }
  return normalized;
}

function normalizedRevision(revision: string): string {
  if (!/^(0|[1-9]\d*)$/.test(revision)) {
    throw new Error('Encounter close revision is invalid.');
  }
  return revision;
}

function normalizedIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 128) {
    throw new Error('Encounter close idempotency key is invalid.');
  }
  return normalized;
}

export function buildEncounterClosePrepareRequest(
  context: EncounterClosePrepareContext,
): AdminPrepareOperationRequest {
  return {
    operationType: 'encounter.close',
    input: {
      playerId: context.playerId,
      encounterId: context.encounterId,
    },
    reason: normalizedReason(context.reason),
    expectedRevision: normalizedRevision(context.encounterRevision),
    idempotencyKey: normalizedIdempotencyKey(context.idempotencyKey),
  };
}
