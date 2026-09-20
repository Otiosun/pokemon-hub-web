import type { ComponentProps } from 'react';
import { PokemonAssetImage } from './PokemonAssetImage';
import type { PokemonVisualVariant } from './pokemonVisualRegistry';

type PokemonImageProps = Omit<
  ComponentProps<typeof PokemonAssetImage>,
  'variant' | 'formSlug' | 'speciesSlug'
>;

export function SpeciesPokemonImage({
  variant = 'regular',
  ...props
}: PokemonImageProps & { variant?: PokemonVisualVariant }) {
  return <PokemonAssetImage {...props} variant={variant} />;
}

export function OwnedPokemonImage({
  shiny,
  formSlug,
  speciesSlug,
  ...props
}: PokemonImageProps & {
  shiny: boolean;
  formSlug?: string | null;
  speciesSlug?: string | null;
}) {
  return (
    <PokemonAssetImage
      {...props}
      formSlug={formSlug ?? undefined}
      speciesSlug={speciesSlug ?? undefined}
      variant={shiny ? 'shiny' : 'regular'}
    />
  );
}
