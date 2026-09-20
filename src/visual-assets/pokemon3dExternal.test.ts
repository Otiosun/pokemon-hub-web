import { describe, expect, it } from 'vitest';
import { getExternalPokemon3dModelUrl } from './pokemon3dExternal';

describe('external Pokemon 3D resolver', () => {
  it('maps National Dex ids to optimized regular GLB assets', () => {
    expect(getExternalPokemon3dModelUrl(1)).toBe(
      'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular/1.glb',
    );
    expect(getExternalPokemon3dModelUrl(102)).toBe(
      'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular/102.glb',
    );
    expect(getExternalPokemon3dModelUrl(386)).toBe(
      'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular/386.glb',
    );
  });

  it('maps shiny variants to the shiny 3D asset category', () => {
    expect(getExternalPokemon3dModelUrl(1, 'shiny')).toBe(
      'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/shiny/1.glb',
    );
    expect(getExternalPokemon3dModelUrl(197, 'shiny')).toBe(
      'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/shiny/197.glb',
    );
  });

  it('rejects invalid dex ids', () => {
    expect(getExternalPokemon3dModelUrl(0)).toBeNull();
    expect(getExternalPokemon3dModelUrl(387)).toBeNull();
    expect(getExternalPokemon3dModelUrl(10.5)).toBeNull();
  });
});
