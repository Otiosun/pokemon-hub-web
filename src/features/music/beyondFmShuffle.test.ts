import { describe, expect, it } from 'vitest';
import { shuffleFmBag } from './beyondFmShuffle';
describe('four song shuffle bag', () => {
  const songs = ['cynthia', 'national-park', 'driftveil', 'alola'];
  it('plays all four once before repeating', () => {
    const bag = shuffleFmBag(songs, null, () => 0.13);
    expect(new Set(bag).size).toBe(4);
    expect([...bag].sort()).toEqual([...songs].sort());
  });
  it('cannot start the new cycle on the song that just played', () => {
    for (const last of songs) for (const rand of [0, 0.15, 0.49, 0.95, 0.999]) {
      const bag = shuffleFmBag(songs, last, () => rand);
      expect(bag[0]).not.toBe(last);
      expect(new Set(bag).size).toBe(4);
    }
  });
  it('handles small lists and bounds random', () => {
    expect(shuffleFmBag(['one'], 'one', () => 100)).toEqual(['one']);
    expect(shuffleFmBag([], null)).toEqual([]);
  });
});

describe('five-track public + private rotation', () => {
  const songs = ['cynthia', 'national-park', 'driftveil', 'alola', 'town-theme'];
  it('includes Town Theme exactly once among the five shuffled tracks', () => {
    const bag = shuffleFmBag(songs, null, () => 0.37);
    expect(bag).toHaveLength(5);
    expect(new Set(bag)).toEqual(new Set(songs));
    for (const last of songs) {
      expect(shuffleFmBag(songs, last, () => 0.37)[0]).not.toBe(last);
    }
  });
});
