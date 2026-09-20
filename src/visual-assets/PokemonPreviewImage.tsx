import type { ComponentProps } from 'react';
import { PokemonAssetImage } from './PokemonAssetImage';
import type { PokemonVisualVariant } from './pokemonVisualRegistry';

type PokemonImageProps = Omit<ComponentProps<typeof PokemonAssetImage>, 'variant'>;

export function SpeciesPokemonImage({
  variant = 'regular',
  ...props
}: PokemonImageProps & { variant?: PokemonVisualVariant }) {
  return <PokemonAssetImage {...props} variant={variant} />;
}

export function OwnedPokemonImage({
  shiny,
  ...props
}: PokemonImageProps & { shiny: boolean }) {
  return <PokemonAssetImage {...props} variant={shiny ? 'shiny' : 'regular'} />;
}
