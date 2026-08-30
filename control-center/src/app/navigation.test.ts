import { describe, expect, it } from 'vitest';
import { visibleSections } from './navigation';

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
