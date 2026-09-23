import { describe, expect, it } from 'vitest';
import { OwnedPokemonImage, SpeciesPokemonImage } from './PokemonPreviewImage';

describe('Pokemon preview context', () => {
  it('keeps species/Pokedex previews on regular assets', () => {
    const element = SpeciesPokemonImage({ dex: 197, assetRole: 'official-artwork' });
    expect(element.props.variant).toBe('regular');
  });

  it('allows Pokedex/species surfaces to request shiny explicitly', () => {
    const shiny = SpeciesPokemonImage({
      dex: 197,
      assetRole: 'official-artwork',
      variant: 'shiny',
    });
    expect(shiny.props.variant).toBe('shiny');
  });

  it('binds owned previews to the instance shiny flag', () => {
    const shiny = OwnedPokemonImage({
      dex: 197,
      assetRole: 'official-artwork',
      shiny: true,
    });
    const regular = OwnedPokemonImage({
      dex: 197,
      assetRole: 'official-artwork',
      shiny: false,
    });

    expect(shiny.props.variant).toBe('shiny');
    expect(regular.props.variant).toBe('regular');
  });
});
