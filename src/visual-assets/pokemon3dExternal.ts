const EXTERNAL_3D_BASE =
  'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular';

const MAX_SHOWCASE_DEX = 386;

export type Pokemon3dVariant = 'regular' | 'shiny';

export function getExternalPokemon3dModelUrl(
  dex: number,
  variant: Pokemon3dVariant = 'regular',
) {
  if (!Number.isInteger(dex) || dex < 1 || dex > MAX_SHOWCASE_DEX) return null;
  const category = variant === 'shiny' ? 'shiny' : 'regular';
  return `https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/${category}/${dex}.glb`;
}
