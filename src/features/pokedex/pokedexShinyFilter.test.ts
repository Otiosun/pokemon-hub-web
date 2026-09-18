import { describe, expect, it } from 'vitest';
import {
  buildOwnedShinyDexSet,
  matchesPokedexShinyFilter,
} from './pokedexShinyFilter';

describe('pokedex shiny filter', () => {
  it('indexes species that have at least one shiny owned pokemon', () => {
    const shinyDexes = buildOwnedShinyDexSet([
      { nationalDex: 94, shiny: false },
      { nationalDex: 94, shiny: true },
      { nationalDex: 384, shiny: true },
      { nationalDex: null, shiny: true },
    ]);

    expect([...shinyDexes].sort((a, b) => a - b)).toEqual([94, 384]);
  });

  it('shows all species normally and only shiny-owned species when requested', () => {
    const shinyDexes = new Set([94, 384]);

    expect(matchesPokedexShinyFilter('Todos', 25, shinyDexes)).toBe(true);
    expect(matchesPokedexShinyFilter('Shiny', 94, shinyDexes)).toBe(true);
    expect(matchesPokedexShinyFilter('Shiny', 25, shinyDexes)).toBe(false);
  });
});
