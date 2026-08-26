import { afterEach, describe, expect, it } from 'vitest';
import {
  clearTeamDraftOrder,
  readTeamDraftOrder,
  readTeamDraftSlot,
  rememberTeamDraftOrder,
} from './teamSession';

afterEach(() => clearTeamDraftOrder());

describe('team draft session', () => {
  it('returns the one-based preview slot for a reordered member', () => {
    rememberTeamDraftOrder(['pkm-squirtle-a1', 'pkm-charmander-a1']);

    expect(readTeamDraftSlot('pkm-charmander-a1')).toBe(2);
    expect(readTeamDraftSlot('pkm-squirtle-a1')).toBe(1);
  });

  it('returns null when no draft exists or the member is outside the draft', () => {
    expect(readTeamDraftSlot('pkm-charmander-a1')).toBeNull();

    rememberTeamDraftOrder(['pkm-squirtle-a1']);
    expect(readTeamDraftSlot('pkm-charmander-a1')).toBeNull();
  });

  it('returns copies so callers cannot mutate the stored order', () => {
    rememberTeamDraftOrder(['pkm-charmander-a1', 'pkm-squirtle-a1']);
    const firstRead = readTeamDraftOrder();
    firstRead?.reverse();

    expect(readTeamDraftOrder()).toEqual(['pkm-charmander-a1', 'pkm-squirtle-a1']);
  });
});
