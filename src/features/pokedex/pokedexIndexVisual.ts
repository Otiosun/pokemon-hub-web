import type { PokedexIndexVisualVariant } from './pokedexIndexSession';

export type PokedexIndexCardVisual = {
  variant: 'regular' | 'shiny';
  locked: boolean;
};

export function resolvePokedexIndexCardVisual(
  visualVariant: PokedexIndexVisualVariant,
  hasRegisteredShiny: boolean,
): PokedexIndexCardVisual {
  if (visualVariant === 'shiny') {
    return hasRegisteredShiny
      ? { variant: 'shiny', locked: false }
      : { variant: 'regular', locked: true };
  }

  return { variant: 'regular', locked: false };
}
