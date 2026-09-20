import { getPokemonAssetBaseUrl } from './assetBaseUrl';
import type { PokemonVisualVariant } from './pokemonVisualRegistry';

export type Pokemon3dCapabilityStatus = 'checking' | 'ready' | 'unsupported' | 'failed';

export type Pokemon3dCapability = {
  status: Pokemon3dCapabilityStatus;
  reason?: 'missing-identity' | 'variant-unsupported' | 'not-in-manifest' | 'manifest-unavailable';
};

type ManifestAsset = {
  dex?: number;
  species?: string;
  path?: string;
};

type Pokemon3dManifest = {
  assets?: ManifestAsset[];
};

export type Pokemon3dCapabilityFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function normalizeSpecies(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getPokemon3dCapability(
  {
    dex,
    species,
    variant = 'regular',
  }: {
    dex: number | null;
    species: string | null;
    variant?: PokemonVisualVariant;
  },
  fetcher: Pokemon3dCapabilityFetcher = fetch,
): Promise<Pokemon3dCapability> {
  if (dex === null || !species) {
    return { status: 'unsupported', reason: 'missing-identity' };
  }

  // The current Generations exporter only emits the default visual variant.
  // Shiny must remain an explicit unsupported state until the pipeline can prove
  // that model, textures and idle animation were generated for that variant.
  if (variant === 'shiny') {
    return { status: 'unsupported', reason: 'variant-unsupported' };
  }

  try {
    const response = await fetcher(`${getPokemonAssetBaseUrl()}/manifest.json`, {
      cache: 'force-cache',
    });
    if (!response.ok) {
      return { status: 'failed', reason: 'manifest-unavailable' };
    }

    const payload = (await response.json()) as Pokemon3dManifest;
    if (!Array.isArray(payload.assets)) {
      return { status: 'failed', reason: 'manifest-unavailable' };
    }

    const speciesSlug = normalizeSpecies(species);
    const available = payload.assets.some((asset) => {
      if (asset.dex === dex) return true;
      const candidate = asset.path ?? asset.species;
      return typeof candidate === 'string' && normalizeSpecies(candidate) === speciesSlug;
    });

    return available
      ? { status: 'ready' }
      : { status: 'unsupported', reason: 'not-in-manifest' };
  } catch {
    return { status: 'failed', reason: 'manifest-unavailable' };
  }
}
