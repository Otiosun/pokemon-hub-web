import { describe, expect, it } from 'vitest';
import {
  buildRegisteredShinyDexSet,
  hasShinyHistoryContract,
  matchesPokedexShinyFilter,
} from './pokedexShinyFilter';

describe('pokedex shiny filter', () => {
  it('indexes species from historical shiny registration, independent of current ownership', () => {
    const shinyDexes = buildRegisteredShinyDexSet([
      { nationalDex: 94, shinySeenCount: '1', shinyCaughtCount: '0' },
      { nationalDex: 384, shinySeenCount: '2', shinyCaughtCount: '1' },
      { nationalDex: 25, shinySeenCount: '0', shinyCaughtCount: '0' },
    ]);

    expect([...shinyDexes].sort((a, b) => a - b)).toEqual([94, 384]);
  });

  it('detects whether the backend supports historical shiny state', () => {
    expect(
      hasShinyHistoryContract([
        { nationalDex: 94, shinySeenCount: '1', shinyCaughtCount: '0' },
      ]),
    ).toBe(true);
    expect(hasShinyHistoryContract([{ nationalDex: 94 }])).toBe(false);
    expect(hasShinyHistoryContract([])).toBe(true);
  });

  it('shows all species normally and only registered shiny species when requested', () => {
    const shinyDexes = new Set([94, 384]);

    expect(matchesPokedexShinyFilter('Todos', 25, shinyDexes)).toBe(true);
    expect(matchesPokedexShinyFilter('Shiny', 94, shinyDexes)).toBe(true);
    expect(matchesPokedexShinyFilter('Shiny', 25, shinyDexes)).toBe(false);
  });
});
