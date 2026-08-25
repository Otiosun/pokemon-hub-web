import { describe, expect, it } from 'vitest';
import type { VisualAssetCandidate } from './contracts';
import { assertSpeciesId } from './contracts';
import { pickFirstAvailable } from './fallback';

const candidate = (available: boolean, url: string): VisualAssetCandidate => ({
  kind: 'artwork',
  provider: 'pokeapi',
  available,
  url,
});

describe('visual asset foundation', () => {
  it('selects the first available candidate', () => {
    const selected = pickFirstAvailable([
      candidate(false, 'https://invalid.example/first.png'),
      candidate(true, 'https://example.com/second.png'),
      candidate(true, 'https://example.com/third.png'),
    ]);

    expect(selected?.url).toBe('https://example.com/second.png');
  });

  it('returns null when every provider is unavailable', () => {
    expect(pickFirstAvailable([candidate(false, 'https://invalid.example/a.png')])).toBeNull();
  });

  it('rejects species outside the Gen I–III launch catalog', () => {
    expect(() => assertSpeciesId(0)).toThrow(RangeError);
    expect(() => assertSpeciesId(387)).toThrow(RangeError);
    expect(assertSpeciesId(25)).toBe(25);
  });
});
