import { describe, expect, it } from 'vitest';
import {
  readPokedexIndexSession,
  rememberPokedexIndexFilters,
  rememberPokedexIndexScroll,
} from './pokedexIndexSession';

describe('pokedex index session', () => {
  it('preserves filters and deep scroll so a species record can return to the same index context', () => {
    rememberPokedexIndexFilters('char', 'Kanto', 'Avistados', 'Shiny', 'shiny', 'fire');
    rememberPokedexIndexScroll(2847.6);

    expect(readPokedexIndexSession()).toEqual({
      query: 'char',
      region: 'Kanto',
      discovery: 'Avistados',
      shiny: 'Shiny',
      visualVariant: 'shiny',
      typeSlug: 'fire',
      scrollY: 2848,
    });
  });

  it('never restores a negative scroll position', () => {
    rememberPokedexIndexScroll(-120);
    expect(readPokedexIndexSession().scrollY).toBe(0);
  });
});
