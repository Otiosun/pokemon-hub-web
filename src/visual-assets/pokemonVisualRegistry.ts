import { getPokemonAssetUrl } from './assetBaseUrl';
import { resolveTypeIconPath } from './TypeIcon';

export type PokemonVisualVariant = 'regular' | 'shiny';
export type PokemonImageRole = 'official-artwork' | 'home-artwork' | 'icon' | 'portrait';

export type PokemonSpeciesVisualAssets = {
  artworkHome: string;
  artworkOfficial: string;
  icon: string;
  portrait: string;
};

export type PokemonVisualImageSource = {
  role: PokemonImageRole;
  provider: VisualProviderId;
  src: string;
};

export type Pokemon3dAssetUrls = {
  manifest: string;
  asset: (filename: string) => string;
};

export type VisualProviderId =
  | 'pokeapi-home'
  | 'pokeapi-official-artwork'
  | 'pokeapi-gen8-icon'
  | 'pokeapi-core-sprite'
  | 'pmdcollab-portrait'
  | 'partywhale-type-icons'
  | 'generations-cobblemon-3d';

export const POKEMON_VISUAL_PROVIDERS: Readonly<Record<VisualProviderId, {
  role: string;
  source: string;
  rights: string;
}>> = {
  'pokeapi-home': {
    role: 'species-first-paint',
    source: 'PokeAPI/sprites · HOME artwork',
    rights: 'pokemon-derived',
  },
  'pokeapi-official-artwork': {
    role: 'species-record-artwork',
    source: 'PokeAPI/sprites · official artwork',
    rights: 'pokemon-derived',
  },
  'pokeapi-gen8-icon': {
    role: 'lightweight-navigation-icon',
    source: 'PokeAPI/sprites · generation-viii icons',
    rights: 'pokemon-derived',
  },
  'pokeapi-core-sprite': {
    role: 'lightweight-shiny-navigation-sprite',
    source: 'PokeAPI/sprites · core sprites',
    rights: 'pokemon-derived',
  },
  'pmdcollab-portrait': {
    role: 'owned-pokemon-portrait',
    source: 'PMDCollab/SpriteCollab',
    rights: 'mixed-community-and-official-derived',
  },
  'partywhale-type-icons': {
    role: 'pokemon-type-symbol',
    source: 'partywhale/pokemon-type-icons',
    rights: 'MIT',
  },
  'generations-cobblemon-3d': {
    role: 'field-dex-specimen-3d',
    source: 'Generations x Cobblemon conversion pipeline',
    rights: 'pokemon-derived / project pipeline; external distribution required',
  },
};

const POKEAPI_SPRITES_ROOT = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const PMD_PORTRAIT_ROOT = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait';

function pmdPortraitUrl(dex: number, variant: PokemonVisualVariant) {
  const padded = String(dex).padStart(4, '0');
  return variant === 'shiny'
    ? `${PMD_PORTRAIT_ROOT}/${padded}/0000/0001/Normal.png`
    : `${PMD_PORTRAIT_ROOT}/${padded}/Normal.png`;
}

export function getPokemonSpeciesVisualAssets(
  dex: number,
  variant: PokemonVisualVariant = 'regular',
): PokemonSpeciesVisualAssets {
  if (variant === 'shiny') {
    return {
      artworkHome: `${POKEAPI_SPRITES_ROOT}/other/home/shiny/${dex}.png`,
      artworkOfficial: `${POKEAPI_SPRITES_ROOT}/other/official-artwork/shiny/${dex}.png`,
      icon: `${POKEAPI_SPRITES_ROOT}/shiny/${dex}.png`,
      portrait: pmdPortraitUrl(dex, variant),
    };
  }
  return {
    artworkHome: `${POKEAPI_SPRITES_ROOT}/other/home/${dex}.png`,
    artworkOfficial: `${POKEAPI_SPRITES_ROOT}/other/official-artwork/${dex}.png`,
    icon: `${POKEAPI_SPRITES_ROOT}/versions/generation-viii/icons/${dex}.png`,
    portrait: pmdPortraitUrl(dex, variant),
  };
}

export function getPokemonImageSources(
  dex: number,
  assetRole: PokemonImageRole,
  variant: PokemonVisualVariant = 'regular',
  formSlug?: string,
): readonly PokemonVisualImageSource[] {
  // The current 2D providers are indexed by species/default-form identity. Once
  // the Hub API proves that an owned Pokemon is a non-default form, do not
  // silently render the base species artwork as if it were that form.
  //
  // An omitted formSlug remains a rollout compatibility path for species views
  // and older Hub payloads until the authoritative formSlug contract is live.
  if (formSlug && formSlug !== 'default') return [];

  const visual = getPokemonSpeciesVisualAssets(dex, variant);
  const official: PokemonVisualImageSource = {
    role: 'official-artwork',
    provider: 'pokeapi-official-artwork',
    src: visual.artworkOfficial,
  };
  const home: PokemonVisualImageSource = {
    role: 'home-artwork',
    provider: 'pokeapi-home',
    src: visual.artworkHome,
  };
  const icon: PokemonVisualImageSource = {
    role: 'icon',
    provider: variant === 'shiny' ? 'pokeapi-core-sprite' : 'pokeapi-gen8-icon',
    src: visual.icon,
  };
  const portrait: PokemonVisualImageSource = {
    role: 'portrait',
    provider: 'pmdcollab-portrait',
    src: visual.portrait,
  };

  switch (assetRole) {
    case 'official-artwork':
      return [official, home, icon];
    case 'home-artwork':
      return [home, official, icon];
    case 'icon':
      return [icon, home, official];
    case 'portrait':
      // Portraits are a visual language of their own. Never fall through to HOME/artwork,
      // otherwise one shiny can look unrelated to the other five members of the same team.
      return [portrait];
  }
}

export function getPokemon3dAssets(speciesSlug: string): Pokemon3dAssetUrls {
  return {
    manifest: getPokemonAssetUrl(speciesSlug, 'asset.json'),
    asset: (filename: string) => getPokemonAssetUrl(speciesSlug, filename),
  };
}

export function getPokemonTypeIconAsset(type: string) {
  return resolveTypeIconPath(type);
}
