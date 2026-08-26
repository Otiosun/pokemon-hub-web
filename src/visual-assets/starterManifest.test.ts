import { describe, expect, it } from 'vitest';
import { getArtworkFallbacks, starterVisuals } from './starterManifest';

describe('starter visual manifest', () => {
  it('covers the three Kanto starters used by the asset spike', () => {
    expect(starterVisuals.map((entry) => entry.id)).toEqual([1, 4, 7]);
  });

  it('builds canonical 3D URLs without duplicating the Git ref path', () => {
    for (const starter of starterVisuals) {
      expect(starter.model3d.url).toContain(`/models/opt/regular/${starter.id}.glb`);
      expect(starter.model3d.url).not.toContain('heads/main/heads/main');
    }
  });

  it('keeps the 2D fallback order deterministic', () => {
    for (const starter of starterVisuals) {
      expect(getArtworkFallbacks(starter).map((asset) => asset.provider)).toEqual([
        'PokeAPI',
        'PokeAPI',
        'PokemonShowdown',
      ]);
    }
  });

  it('registers four verified PMD portrait emotions per starter', () => {
    for (const starter of starterVisuals) {
      expect(Object.keys(starter.portraits)).toEqual(['Normal', 'Happy', 'Angry', 'Pain']);
    }
  });
});
