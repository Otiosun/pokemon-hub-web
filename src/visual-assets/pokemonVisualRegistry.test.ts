import { describe, expect, it } from 'vitest';
import { getPokemonSpeciesVisualAssets } from './pokemonVisualRegistry';

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
});
