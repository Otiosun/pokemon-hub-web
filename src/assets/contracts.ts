export type VisualAssetKind =
  | 'model3d'
  | 'artwork'
  | 'portrait'
  | 'boxIcon'
  | 'battleSprite';

export type AssetProviderId =
  | 'pokemon-3d-api'
  | 'pokeapi'
  | 'pmd-collab'
  | 'pokesprite'
  | 'pokemon-showdown';

export interface VisualAssetCandidate {
  readonly kind: VisualAssetKind;
  readonly provider: AssetProviderId;
  readonly url: string;
  readonly available: boolean;
  readonly credit?: string;
}

export interface PokemonVisualIdentity {
  readonly speciesId: number;
  readonly slug: string;
  readonly shiny: boolean;
}

export function assertSpeciesId(speciesId: number): number {
  if (!Number.isInteger(speciesId) || speciesId < 1 || speciesId > 386) {
    throw new RangeError(`speciesId must be an integer between 1 and 386. Received: ${speciesId}`);
  }

  return speciesId;
}
