import { useState } from 'react';

const TYPE_ICON_SOURCE = 'https://raw.githubusercontent.com/partywhale/pokemon-type-icons/main/icons';

const TYPE_SLUGS: Record<string, string> = {
  normal: 'normal',
  fogo: 'fire',
  fire: 'fire',
  água: 'water',
  agua: 'water',
  water: 'water',
  elétrico: 'electric',
  eletrico: 'electric',
  electric: 'electric',
  planta: 'grass',
  grass: 'grass',
  gelo: 'ice',
  ice: 'ice',
  lutador: 'fighting',
  fighting: 'fighting',
  veneno: 'poison',
  poison: 'poison',
  terrestre: 'ground',
  ground: 'ground',
  voador: 'flying',
  flying: 'flying',
  psíquico: 'psychic',
  psiquico: 'psychic',
  psychic: 'psychic',
  inseto: 'bug',
  bug: 'bug',
  pedra: 'rock',
  rock: 'rock',
  fantasma: 'ghost',
  ghost: 'ghost',
  dragão: 'dragon',
  dragao: 'dragon',
  dragon: 'dragon',
  sombrio: 'dark',
  dark: 'dark',
  aço: 'steel',
  aco: 'steel',
  steel: 'steel',
  fada: 'fairy',
  fairy: 'fairy',
};

function normalizeType(type: string) {
  return type.trim().toLocaleLowerCase('pt-BR');
}

export function resolveTypeIconUrl(type: string) {
  const slug = TYPE_SLUGS[normalizeType(type)];
  return slug ? `${TYPE_ICON_SOURCE}/${slug}.svg` : null;
}

type TypeIconProps = {
  type: string;
  className?: string;
  fallbackColor?: string;
};

export function TypeIcon({ type, className = '', fallbackColor = 'currentColor' }: TypeIconProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveTypeIconUrl(type);
  const classes = ['pokemon-type-icon', className].filter(Boolean).join(' ');

  if (!src || failed) {
    return (
      <span
        className={`${classes} pokemon-type-icon-fallback`}
        style={{ backgroundColor: fallbackColor }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      className={classes}
      src={src}
      alt=""
      aria-hidden="true"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
