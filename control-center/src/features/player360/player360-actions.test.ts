import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { contextualPlayerActions } from './player360-actions';

const BASE_PLAYER = {
  activeBattle: null,
  activeEncounter: null,
} as unknown as Player360Overview;

describe('Player 360 contextual action rail', () => {
  it('fails closed when the session has no mutation capabilities', () => {
    expect(contextualPlayerActions(new Set(), BASE_PLAYER)).toEqual([]);
  });

  it('derives player-level actions from exact Registry capabilities without privilege expansion', () => {
    const actions = contextualPlayerActions(
      new Set(['inventory.adjust', 'wallet.adjust', 'progression.adjust', 'pokemon.create']),
      BASE_PLAYER,
    );

    expect(actions.map((action) => action.operationType)).toEqual([
      'inventory.adjust',
      'wallet.adjust',
      'progression.trainer.adjust',
      'pokemon.create',
    ]);
    expect(actions.map((action) => action.riskTier)).toEqual([2, 2, 2, 3]);
    expect(actions.every((action) => action.targetKind === 'PLAYER')).toBe(true);
  });

  it('only exposes battle and encounter actions when capability and live context both exist', () => {
    const capabilities = new Set([
      'battle.force_cancel',
      'battle.correct_state',
      'encounter.force_close',
    ]);

    expect(contextualPlayerActions(capabilities, BASE_PLAYER)).toEqual([]);

    const livePlayer = {
      ...BASE_PLAYER,
      activeBattle: { id: 'battle-1' },
      activeEncounter: { id: 'encounter-1' },
    } as unknown as Player360Overview;

    expect(
      contextualPlayerActions(capabilities, livePlayer).map((action) => action.operationType),
    ).toEqual(['battle.force_cancel', 'battle.correct_state', 'encounter.close']);
  });

  it('does not surface instance-level Pokemon mechanics without a selected Pokemon target', () => {
    const actions = contextualPlayerActions(
      new Set(['pokemon.edit.mechanics', 'pokemon.roster.manage', 'pokemon.archive_remove']),
      BASE_PLAYER,
    );

    expect(actions).toEqual([]);
  });
});
