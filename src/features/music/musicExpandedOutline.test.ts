import { describe, expect, it } from 'vitest';
import { expandedMusicOutline } from './musicExpandedOutline';

describe('expanded music frame path', () => {
  it('uses one closed path with four corners, sized to the actual card', () => {
    const desktop = expandedMusicOutline(248, 165);
    const mobile = expandedMusicOutline(232, 202);
    expect(desktop).not.toBe(mobile);
    expect(desktop.startsWith('M 12 1.5 H 236')).toBe(true);
    expect(mobile.includes('V 190')).toBe(true);
    expect(desktop.match(/ A /g)).toHaveLength(4);
    expect(desktop.endsWith('Z')).toBe(true);
  });

  it('does not create invalid paths before the card is measured', () => {
    expect(expandedMusicOutline(0, 0)).toBe('');
    expect(expandedMusicOutline(Number.NaN, 100)).toBe('');
    expect(expandedMusicOutline(100, Number.POSITIVE_INFINITY)).toBe('');
  });

  it('clamps corner radius when the card is narrow', () => {
    const path = expandedMusicOutline(16, 16);
    expect(path).toContain('A 6.5 6.5');
    expect(path.endsWith('Z')).toBe(true);
  });
});
