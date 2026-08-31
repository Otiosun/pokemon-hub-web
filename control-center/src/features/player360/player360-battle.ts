import type { Player360Overview } from '../../lib/api/admin-api';

export interface Player360EffectView {
  readonly id: string;
  readonly effectId: string;
  readonly effectSlug: string;
  readonly contentReleaseId: string;
  readonly playerId: string | null;
  readonly pokemonInstanceId: string | null;
}

export interface Player360EncounterView {
  readonly id: string;
  readonly status: string;
  readonly areaId: string;
  readonly contentReleaseId: string;
  readonly rulesetId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Player360BattleView {
  readonly id: string;
  readonly status: string;
  readonly battleType: string;
  readonly encounterId: string | null;
  readonly contentReleaseId: string;
  readonly rulesetId: string;
  readonly turnNumber: number;
  readonly version: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly endedAt: string | null;
}

export interface Player360BattleContextView {
  readonly activeEncounter: Player360EncounterView | null;
  readonly activeBattle: Player360BattleView | null;
  readonly effects: readonly Player360EffectView[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseEncounter(value: unknown): Player360EncounterView | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !nonEmptyString(value.id) ||
    !nonEmptyString(value.status) ||
    !nonEmptyString(value.areaId) ||
    !nonEmptyString(value.contentReleaseId) ||
    !nonEmptyString(value.rulesetId) ||
    !nonEmptyString(value.createdAt) ||
    !nonEmptyString(value.updatedAt)
  ) {
    throw new Error('Invalid Player 360 encounter.');
  }
  return value as unknown as Player360EncounterView;
}

function parseBattle(value: unknown): Player360BattleView | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !nonEmptyString(value.id) ||
    !nonEmptyString(value.status) ||
    !nonEmptyString(value.battleType) ||
    !nullableString(value.encounterId) ||
    !nonEmptyString(value.contentReleaseId) ||
    !nonEmptyString(value.rulesetId) ||
    !Number.isInteger(value.turnNumber) ||
    Number(value.turnNumber) < 0 ||
    !nonEmptyString(value.version) ||
    !nonEmptyString(value.createdAt) ||
    !nonEmptyString(value.updatedAt) ||
    !nullableString(value.endedAt)
  ) {
    throw new Error('Invalid Player 360 battle.');
  }
  return value as unknown as Player360BattleView;
}

function parseEffect(value: unknown): Player360EffectView {
  if (
    !isRecord(value) ||
    !nonEmptyString(value.id) ||
    !nonEmptyString(value.effectId) ||
    !nonEmptyString(value.effectSlug) ||
    !nonEmptyString(value.contentReleaseId) ||
    !nullableString(value.playerId) ||
    !nullableString(value.pokemonInstanceId)
  ) {
    throw new Error('Invalid Player 360 effect.');
  }
  return value as unknown as Player360EffectView;
}

export function parsePlayer360BattleContext(player: Player360Overview): Player360BattleContextView {
  return {
    activeEncounter: parseEncounter(player.activeEncounter),
    activeBattle: parseBattle(player.activeBattle),
    effects: player.effects.map(parseEffect),
  };
}
