import {
  createAdvancedShowcasePokedex,
  createAdvancedShowcasePokemon,
  getAdvancedShowcaseSession,
  isAdvancedShowcaseUrl,
} from '../../showcase/advancedShowcase';
import { describe, expect, it } from 'vitest';

describe('advanced showcase contract', () => {
  it('activates only for the explicit advanced showcase query value', () => {
    expect(
      isAdvancedShowcaseUrl(new URL('https://example.test/jornada?showcase=advanced')),
    ).toBe(true);
    expect(
      isAdvancedShowcaseUrl(new URL('https://example.test/jornada?showcase=basic')),
    ).toBe(false);
  });

  it('provides a complete Gen I-III dex, a full team and shiny examples', () => {
    const pokedex = createAdvancedShowcasePokedex();
    const pokemon = createAdvancedShowcasePokemon();
    const session = getAdvancedShowcaseSession();

    expect(pokedex).toHaveLength(386);
    expect(new Set(pokedex.map((entry) => entry.nationalDex)).size).toBe(386);
    expect(pokedex.every((entry) => BigInt(entry.caughtCount) > 0n)).toBe(true);
    expect(pokemon.filter((entry) => entry.placementKind === 'TEAM')).toHaveLength(6);
    expect(pokemon.filter((entry) => entry.shiny).length).toBeGreaterThanOrEqual(6);
    expect(session.status).toBe('authenticated');
  });
});
