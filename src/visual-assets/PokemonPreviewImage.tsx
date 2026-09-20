import type { ComponentProps } from 'react';
import { PokemonAssetImage } from './PokemonAssetImage';

type PokemonImageProps = Omit<ComponentProps<typeof PokemonAssetImage>, 'variant'>;

export function SpeciesPokemonImage(props: PokemonImageProps) {
  return <PokemonAssetImage {...props} variant="regular" />;
}

export function OwnedPokemonImage({
  shiny,
  ...props
}: PokemonImageProps & { shiny: boolean }) {
  return <PokemonAssetImage {...props} variant={shiny ? 'shiny' : 'regular'} />;
}
