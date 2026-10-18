import { describe, expect, it } from 'vitest';
import { expandedMusicOutline, musicProgressStroke } from './musicExpandedOutline';

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

  it('uses the exact same percentage for the 46px Rotom and large panel', () => {
    const mini = expandedMusicOutline(46, 46, 12.5);
    const open = expandedMusicOutline(248, 165);
    expect(mini.startsWith('M 14 1.5 H 32')).toBe(true);
    expect(open).not.toBe(mini);
    // Both lengths are measured by SVGPathElement.getTotalLength() in the browser.
    const lengths = [138.8, 791.3];
    for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
      for (const length of lengths) {
        const stroke = musicProgressStroke(length, ratio);
        expect(stroke.dasharray).toBe(`${length} ${length}`);
        expect(1 - stroke.dashoffset / length).toBeCloseTo(ratio, 10);
        expect(stroke.visible).toBe(ratio > 0);
      }
    }
  });

  it('clamps percentage safely without accumulating beyond 100%', () => {
    expect(musicProgressStroke(300, -4).dashoffset).toBe(300);
    expect(musicProgressStroke(300, 5).dashoffset).toBe(0);
    expect(musicProgressStroke(300, Number.NaN).visible).toBe(false);
    expect(musicProgressStroke(0, 0.5).visible).toBe(false);
  });

  it('clamps corner radius when the card is narrow', () => {
    const path = expandedMusicOutline(16, 16);
    expect(path).toContain('A 6.5 6.5');
    expect(path.endsWith('Z')).toBe(true);
  });
});
