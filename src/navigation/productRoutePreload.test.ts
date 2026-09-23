import { describe, expect, it } from 'vitest';
import { productRouteChunk } from './productRoutePreload';

describe('product route preload classification', () => {
  it('preloads the exact player-facing surface for detail routes', () => {
    expect(productRouteChunk('/pokedex/25')).toBe('pokedex-species');
    expect(productRouteChunk('/pokemon/owned-charmander-01')).toBe('owned-pokemon');
    expect(productRouteChunk('/team')).toBe('team');
  });

  it('keeps primary roots distinct', () => {
    expect(productRouteChunk('/jornada')).toBe('journey');
    expect(productRouteChunk('/jornada/inventario')).toBe('inventory');
    expect(productRouteChunk('/jornada/movimentos')).toBe('journey');
    expect(productRouteChunk('/pokedex')).toBe('pokedex-index');
    expect(productRouteChunk('/pokemon')).toBe('box');
  });

  it('never preloads technical or invalid surfaces', () => {
    expect(productRouteChunk('/asset-lab')).toBeNull();
    expect(productRouteChunk('/pokemon/demo-unknown')).toBeNull();
    expect(productRouteChunk('/qualquer-coisa')).toBeNull();
  });
});
