import { describe, expect, it } from 'vitest';
import { blocksLastTeamMemberBoxMove } from './collectionOrganizerRules';

describe('collection organizer rules', () => {
  it('blocks depositing the last active Team member into an empty Box slot', () => {
    expect(
      blocksLastTeamMemberBoxMove({
        sourceInTeam: true,
        teamSize: 1,
        targetOccupied: false,
      }),
    ).toBe(true);
  });

  it('allows the last active Team member to swap with an occupied Box slot', () => {
    expect(
      blocksLastTeamMemberBoxMove({
        sourceInTeam: true,
        teamSize: 1,
        targetOccupied: true,
      }),
    ).toBe(false);
  });

  it('does not constrain ordinary Box moves or larger Teams', () => {
    expect(
      blocksLastTeamMemberBoxMove({
        sourceInTeam: false,
        teamSize: 1,
        targetOccupied: false,
      }),
    ).toBe(false);
    expect(
      blocksLastTeamMemberBoxMove({
        sourceInTeam: true,
        teamSize: 2,
        targetOccupied: false,
      }),
    ).toBe(false);
  });
});
