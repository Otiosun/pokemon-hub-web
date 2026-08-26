import { useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';
import { getPokemonSpeciesVisualAssets } from './pokemonVisualRegistry';
import './pokemon-asset-image.css';

export type PokemonImageRole = 'official-artwork' | 'home-artwork' | 'icon' | 'portrait';

type PokemonAssetImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  dex: number;
  role: PokemonImageRole;
  fallbackLabel?: string;
  onResolved?: (sourceRole: PokemonImageRole | 'placeholder') => void;
};

function sourceOrder(dex: number, role: PokemonImageRole) {
  const visual = getPokemonSpeciesVisualAssets(dex);
  const sources: Record<PokemonImageRole, Array<{ role: PokemonImageRole; src: string }>> = {
    'official-artwork': [
      { role: 'official-artwork', src: visual.artworkOfficial },
      { role: 'home-artwork', src: visual.artworkHome },
      { role: 'icon', src: visual.icon },
    ],
    'home-artwork': [
      { role: 'home-artwork', src: visual.artworkHome },
      { role: 'official-artwork', src: visual.artworkOfficial },
      { role: 'icon', src: visual.icon },
    ],
    icon: [
      { role: 'icon', src: visual.icon },
      { role: 'home-artwork', src: visual.artworkHome },
      { role: 'official-artwork', src: visual.artworkOfficial },
    ],
    portrait: [
      { role: 'portrait', src: visual.portrait },
      { role: 'home-artwork', src: visual.artworkHome },
      { role: 'official-artwork', src: visual.artworkOfficial },
      { role: 'icon', src: visual.icon },
    ],
  };
  return sources[role];
}

export function PokemonAssetImage({
  dex,
  role,
  fallbackLabel = '?',
  className = '',
  onResolved,
  alt,
  ...imageProps
}: PokemonAssetImageProps) {
  const sources = useMemo(() => sourceOrder(dex, role), [dex, role]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [dex, role]);

  const source = sources[sourceIndex];
  if (!source) {
    return (
      <span
        className={`pokemon-asset-placeholder ${className}`.trim()}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        {fallbackLabel}
      </span>
    );
  }

  return (
    <img
      {...imageProps}
      className={className}
      src={source.src}
      alt={alt}
      data-asset-role={source.role}
      onLoad={() => onResolved?.(source.role)}
      onError={() => {
        const nextIndex = sourceIndex + 1;
        if (nextIndex >= sources.length) onResolved?.('placeholder');
        setSourceIndex(nextIndex);
      }}
    />
  );
}
