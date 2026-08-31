import type { Player360Overview } from '../../lib/api/admin-api';

export type Player360ActivityKind =
  | 'TRAINER_PROGRESS'
  | 'INVENTORY'
  | 'WALLET'
  | 'POKEMON_HISTORY';

export interface Player360ActivityView {
  readonly kind: Player360ActivityKind;
  readonly occurredAt: string;
  readonly subjectId: string | null;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly reason: string | null;
  readonly correlationId: string | null;
}

const ACTIVITY_KINDS = new Set<Player360ActivityKind>([
  'TRAINER_PROGRESS',
  'INVENTORY',
  'WALLET',
  'POKEMON_HISTORY',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseActivity(value: unknown): Player360ActivityView {
  if (
    !isRecord(value) ||
    typeof value.kind !== 'string' ||
    !ACTIVITY_KINDS.has(value.kind as Player360ActivityKind) ||
    !nonEmptyString(value.occurredAt) ||
    !nullableString(value.subjectId) ||
    !nonEmptyString(value.sourceType) ||
    !nonEmptyString(value.sourceId) ||
    !nullableString(value.reason) ||
    !nullableString(value.correlationId)
  ) {
    throw new Error('Invalid Player 360 activity entry.');
  }

  return {
    kind: value.kind as Player360ActivityKind,
    occurredAt: value.occurredAt,
    subjectId: value.subjectId,
    sourceType: value.sourceType,
    sourceId: value.sourceId,
    reason: value.reason,
    correlationId: value.correlationId,
  };
}

export function parsePlayer360Activity(player: Player360Overview): readonly Player360ActivityView[] {
  return player.recentActivity.map(parseActivity);
}
