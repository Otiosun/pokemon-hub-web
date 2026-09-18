const EXTERNAL_3D_BASE =
  'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular';

const MAX_SHOWCASE_DEX = 386;

export function getExternalPokemon3dModelUrl(dex: number) {
  if (!Number.isInteger(dex) || dex < 1 || dex > MAX_SHOWCASE_DEX) return null;
  return `${EXTERNAL_3D_BASE}/${dex}.glb`;
}
