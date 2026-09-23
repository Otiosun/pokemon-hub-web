import { describe, expect, it } from 'vitest';
import { resolvePokedexIndexCardVisual } from './pokedexIndexVisual';

describe('Pokédex index card visual', () => {
  it('shows the registered shiny artwork when SHINY visual mode is selected', () => {
    expect(resolvePokedexIndexCardVisual('shiny', true)).toEqual({
      variant: 'shiny',
      locked: false,
    });
  });

  it('keeps NORMAL visual independent even when shiny history exists', () => {
    expect(resolvePokedexIndexCardVisual('regular', true)).toEqual({
      variant: 'regular',
      locked: false,
    });
  });

  it('locks only the shiny visual for species without registered shiny history', () => {
    expect(resolvePokedexIndexCardVisual('shiny', false)).toEqual({
      variant: 'regular',
      locked: true,
    });
  });
});
