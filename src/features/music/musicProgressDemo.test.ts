import { describe, expect, it } from 'vitest';
import { MUSIC_DEMO_DURATION_MS, MUSIC_DEMO_HOLD_MS, demoProgressAt } from './musicProgressDemo';

describe('music electric border visual preview', () => {
  it('covers the full contour over 16 seconds, independently of audio', () => {
    expect(MUSIC_DEMO_DURATION_MS).toBe(16_000);
    expect(demoProgressAt(0)).toBe(0);
    expect(demoProgressAt(4_000)).toBe(0.25);
    expect(demoProgressAt(8_000)).toBe(0.5);
    expect(demoProgressAt(12_000)).toBe(0.75);
    expect(demoProgressAt(16_000)).toBe(1);
    expect(demoProgressAt(16_000 + MUSIC_DEMO_HOLD_MS)).toBe(1);
  });

  it('clamps impossible timestamps', () => {
    expect(demoProgressAt(-10)).toBe(0);
    expect(demoProgressAt(Number.NaN)).toBe(0);
    expect(demoProgressAt(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
