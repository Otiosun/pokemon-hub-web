import { describe, expect, it } from 'vitest';
import { canSeeSection, CONTROL_CENTER_SECTIONS, visibleSections } from './navigation';

describe('visibleSections', () => {
  it('keeps only universally useful navigation visible without privileges', () => {
    const ids = visibleSections(new Set()).map((section) => section.id);

    expect(ids).toEqual(['today']);
  });

  it('does not reveal planned surfaces for unrelated or invented capabilities', () => {
    const ids = visibleSections(new Set(['made.up.capability'])).map((section) => section.id);

    expect(ids).toEqual(['today']);
    expect(ids).not.toContain('liveops');
  });

  it('fails closed for planned sections until a real backend capability contract exists', () => {
    const liveops = CONTROL_CENTER_SECTIONS.find((section) => section.id === 'liveops');

    expect(liveops).toBeDefined();
    if (!liveops) throw new Error('LiveOps navigation contract is missing.');

    expect(liveops.availability).toBe('planned');
    expect(canSeeSection(liveops, new Set())).toBe(false);
    expect(canSeeSection(liveops, new Set(['made.up.capability']))).toBe(false);
  });

  it('reveals player and administration surfaces only with matching capabilities', () => {
    const ids = visibleSections(new Set(['player.read', 'audit.read'])).map(
      (section) => section.id,
    );

    expect(ids).toContain('players');
    expect(ids).toContain('operations');
    expect(ids).toContain('administration');
    expect(ids).not.toContain('game');
    expect(ids).not.toContain('liveops');
  });

  it('reveals game tools only for real content capabilities', () => {
    const ids = visibleSections(new Set(['content.validate'])).map((section) => section.id);

    expect(ids).toEqual(['today', 'game']);
  });
});
