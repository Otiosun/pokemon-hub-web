import { getPokemonAssetUrl } from './assetBaseUrl';
import { resolveTypeIconPath } from './TypeIcon';

export type PokemonVisualVariant = 'regular' | 'shiny';

export type PokemonSpeciesVisualAssets = {
  artworkHome: string;
  artworkOfficial: string;
  icon: string;
  portrait: string;
};

export type Pokemon3dAssetUrls = {
  manifest: string;
  asset: (filename: string) => string;
};

export type VisualProviderId =
  | 'pokeapi-home'
  | 'pokeapi-official-artwork'
  | 'pokeapi-gen8-icon'
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

export function getPokemonSpeciesVisualAssets(
  dex: number,
  variant: PokemonVisualVariant = 'regular',
): PokemonSpeciesVisualAssets {
  const padded = String(dex).padStart(4, '0');
  if (variant === 'shiny') {
    return {
      artworkHome: `${POKEAPI_SPRITES_ROOT}/other/home/shiny/${dex}.png`,
      artworkOfficial: `${POKEAPI_SPRITES_ROOT}/other/official-artwork/shiny/${dex}.png`,
      icon: `${POKEAPI_SPRITES_ROOT}/shiny/${dex}.png`,
      portrait: `${POKEAPI_SPRITES_ROOT}/other/home/shiny/${dex}.png`,
    };
  }
  return {
    artworkHome: `${POKEAPI_SPRITES_ROOT}/other/home/${dex}.png`,
    artworkOfficial: `${POKEAPI_SPRITES_ROOT}/other/official-artwork/${dex}.png`,
    icon: `${POKEAPI_SPRITES_ROOT}/versions/generation-viii/icons/${dex}.png`,
    portrait: `${PMD_PORTRAIT_ROOT}/${padded}/Normal.png`,
  };
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
