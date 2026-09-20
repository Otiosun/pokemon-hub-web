import { describe, expect, it } from 'vitest';
import {
  getPokemonImageSources,
  getPokemonSpeciesVisualAssets,
} from './pokemonVisualRegistry';

describe('Pokemon visual variants', () => {
  it('keeps species previews on regular assets by default', () => {
    expect(getPokemonSpeciesVisualAssets(197).artworkOfficial).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/197.png',
    );
  });

  it('resolves owned shiny artwork and lightweight sprites from shiny sources', () => {
    const shiny = getPokemonSpeciesVisualAssets(197, 'shiny');
    expect(shiny.artworkOfficial).toContain('/official-artwork/shiny/197.png');
    expect(shiny.artworkHome).toContain('/home/shiny/197.png');
    expect(shiny.icon).toContain('/shiny/197.png');
  });

  it('keeps regular and shiny team portraits inside PMDCollab', () => {
    expect(getPokemonSpeciesVisualAssets(384).portrait).toBe(
      'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait/0384/Normal.png',
    );
    expect(getPokemonSpeciesVisualAssets(384, 'shiny').portrait).toBe(
      'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait/0384/0000/0001/Normal.png',
    );
  });

  it('does not silently fall through from portrait to unrelated artwork providers', () => {
    const sources = getPokemonImageSources(384, 'portrait', 'shiny');

    expect(sources).toHaveLength(1);
    expect(sources[0]?.provider).toBe('pmdcollab-portrait');
    expect(sources[0]?.role).toBe('portrait');
  });


  it('does not render base-species art for an explicitly non-default owned form', () => {
    expect(getPokemonImageSources(386, 'official-artwork', 'regular', 'attack')).toEqual([]);
    expect(getPokemonImageSources(386, 'portrait', 'shiny', 'speed')).toEqual([]);
  });

  it('keeps default and rollout-legacy form identities on the base species pipeline', () => {
    expect(getPokemonImageSources(386, 'official-artwork', 'regular', 'default')).not.toHaveLength(0);
    expect(getPokemonImageSources(386, 'official-artwork', 'regular')).not.toHaveLength(0);
  });
});
