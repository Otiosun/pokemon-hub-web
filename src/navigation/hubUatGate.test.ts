import { describe, expect, it } from 'vitest';
import { resolveProductRoute } from './productIntegrity';
import { productRouteChunk } from './productRoutePreload';

describe('Hub UAT gate', () => {
  it('keeps the current Journey companion surfaces player-facing', () => {
    expect(resolveProductRoute('/jornada')).toEqual({ kind: 'route' });
    expect(resolveProductRoute('/jornada/inventario')).toEqual({ kind: 'route' });
    expect(resolveProductRoute('/jornada/movimentos')).toEqual({ kind: 'route' });
    expect(productRouteChunk('/jornada/inventario')).toBe('inventory');
    expect(productRouteChunk('/jornada/movimentos')).toBe('move-learning');
  });
});
