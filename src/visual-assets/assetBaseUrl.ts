const LOCAL_ASSET_BASE_URL = '/research/generations';

function normaliseBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getPokemonAssetBaseUrl(): string {
  const configured = import.meta.env.VITE_POKEMON_ASSET_BASE_URL?.trim();
  if (!configured) return LOCAL_ASSET_BASE_URL;
  return normaliseBaseUrl(configured);
}

export function getPokemonAssetUrl(species: string, filename: string): string {
  const base = getPokemonAssetBaseUrl();
  return `${base}/${encodeURIComponent(species)}/${encodeURIComponent(filename)}`;
}
