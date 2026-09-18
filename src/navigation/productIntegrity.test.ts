import { describe, expect, it } from 'vitest';
import { resolveProductRoute } from './productIntegrity';

describe('product integrity routing', () => {
  it('redirects every known legacy demo Pokémon route to the canonical Pokédex record', () => {
    const redirects = new Map([
      ['/pokemon/demo-charmander', '/pokedex/4'],
      ['/pokemon/demo-caterpie', '/pokedex/10'],
      ['/pokemon/demo-suicune', '/pokedex/245'],
      ['/pokemon/demo-lugia', '/pokedex/249'],
      ['/pokemon/demo-rayquaza', '/pokedex/384'],
    ]);

    for (const [legacy, canonical] of redirects) {
      expect(resolveProductRoute(legacy)).toEqual({ kind: 'redirect', to: canonical });
      expect(resolveProductRoute(`${legacy}/`)).toEqual({ kind: 'redirect', to: canonical });
    }
  });

  it('does not expose unknown demo or asset-lab routes as player-facing product surfaces', () => {
    expect(resolveProductRoute('/pokemon/demo-nao-existe')).toEqual({ kind: 'not-found' });
    expect(resolveProductRoute('/asset-lab')).toEqual({ kind: 'not-found' });
    expect(resolveProductRoute('/asset-lab/generations')).toEqual({ kind: 'not-found' });
  });

  it('rejects invalid Pokédex records instead of coercing them into another species', () => {
    expect(resolveProductRoute('/pokedex/0')).toEqual({ kind: 'not-found' });
    expect(resolveProductRoute('/pokedex/387')).toEqual({ kind: 'not-found' });
    expect(resolveProductRoute('/pokedex/abc')).toEqual({ kind: 'not-found' });
  });

  it('keeps Champion Store as a player-facing product route', () => {
    expect(resolveProductRoute('/champion-store')).toEqual({ kind: 'route' });
  });

  it('keeps legitimate owned-Pokémon instance routes available', () => {
    expect(resolveProductRoute('/pokemon/owned-charmander-01')).toEqual({ kind: 'route' });
  });

  it('returns not-found for an unknown product URL instead of silently opening Jornada', () => {
    expect(resolveProductRoute('/alguma-rota-que-nao-existe')).toEqual({ kind: 'not-found' });
  });
});
