import { describe, expect, it } from 'vitest';
import { resolveProductRoute } from './productIntegrity';

describe('product integrity routing', () => {
  it('redirects legacy demo Pokémon routes to the canonical Pokédex species record', () => {
    expect(resolveProductRoute('/pokemon/demo-charmander')).toEqual({
      kind: 'redirect',
      to: '/pokedex/4',
    });
  });

  it('does not expose asset lab routes as player-facing product surfaces', () => {
    expect(resolveProductRoute('/asset-lab/generations')).toEqual({ kind: 'not-found' });
  });

  it('returns not-found for an unknown product URL instead of silently opening Jornada', () => {
    expect(resolveProductRoute('/alguma-rota-que-nao-existe')).toEqual({ kind: 'not-found' });
  });
});
