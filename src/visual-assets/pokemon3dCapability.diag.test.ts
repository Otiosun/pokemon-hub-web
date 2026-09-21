import { describe, expect, it } from 'vitest';
import { getPokemon3dCapability } from './pokemon3dCapability';

describe('Pokemon 3D capability typecheck diagnostic', () => {
  it('loads the capability module under the strict test config', () => {
    expect(typeof getPokemon3dCapability).toBe('function');
  });
});
