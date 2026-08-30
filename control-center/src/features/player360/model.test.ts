import { describe, expect, it } from 'vitest';
import {
  EMPTY_PLAYER_SEARCH_FILTERS,
  PLAYER360_TABS,
  toPlayerSearchQuery,
  validatePlayerSearchFilters,
} from './model';

describe('Player 360 UI contract', () => {
  it('keeps the eight canonical operator tabs', () => {
    expect(PLAYER360_TABS.map((tab) => tab.id)).toEqual([
      'overview',
      'pokemon',
      'inventory',
      'progression',
      'world',
      'pokedex',
      'battle',
      'history',
    ]);
  });

  it('does not emit empty optional search fields', () => {
    expect(toPlayerSearchQuery(EMPTY_PLAYER_SEARCH_FILTERS)).toEqual({
      includeSensitive: false,
      limit: 25,
    });
  });

  it('requires external identity fields as a pair', () => {
    expect(
      validatePlayerSearchFilters({
        ...EMPTY_PLAYER_SEARCH_FILTERS,
        identityProvider: 'whatsapp',
      }),
    ).toContain('Identidade externa exige provedor e identificador juntos.');
  });

  it('requires sensitive authorization for external identity lookup', () => {
    expect(
      validatePlayerSearchFilters({
        ...EMPTY_PLAYER_SEARCH_FILTERS,
        identityProvider: 'whatsapp',
        externalId: 'example',
      }),
    ).toContain('Busca por identidade externa exige leitura sensível autorizada.');
  });
});
