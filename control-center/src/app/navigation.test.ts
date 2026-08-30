import { describe, expect, it } from 'vitest';
import { visibleSections } from './navigation';

describe('visibleSections', () => {
  it('keeps foundation sections visible without privileges while hiding privileged areas', () => {
    const ids = visibleSections(new Set()).map((section) => section.id);

    expect(ids).toContain('today');
    expect(ids).toContain('liveops');
    expect(ids).not.toContain('players');
    expect(ids).not.toContain('game');
    expect(ids).not.toContain('administration');
  });

  it('reveals player and administration surfaces only with matching capabilities', () => {
    const ids = visibleSections(new Set(['player.read', 'audit.read'])).map(
      (section) => section.id,
    );

    expect(ids).toContain('players');
    expect(ids).toContain('operations');
    expect(ids).toContain('administration');
    expect(ids).not.toContain('game');
  });
});
