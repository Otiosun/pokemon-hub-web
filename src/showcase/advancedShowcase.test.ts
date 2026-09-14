import { describe, expect, it } from 'vitest';
import {
  createAdvancedShowcasePokedex,
  createAdvancedShowcasePokemon,
  getAdvancedShowcaseSession,
  isAdvancedShowcaseUrl,
} from './advancedShowcase';

describe('advanced showcase', () => {
  it('activates only for the explicit advanced showcase query value', () => {
    expect(isAdvancedShowcaseUrl(new URL('https://example.test/jornada?showcase=advanced'))).toBe(true);
    expect(isAdvancedShowcaseUrl(new URL('https://example.test/jornada?showcase=basic'))).toBe(false);
    expect(isAdvancedShowcaseUrl(new URL('https://example.test/jornada'))).toBe(false);
  });

  it('represents a completed Gen I-III Pokédex without duplicate dex entries', () => {
    const pokedex = createAdvancedShowcasePokedex();

    expect(pokedex).toHaveLength(386);
    expect(new Set(pokedex.map((entry) => entry.nationalDex)).size).toBe(386);
    expect(pokedex[0]?.nationalDex).toBe(1);
    expect(pokedex.at(-1)?.nationalDex).toBe(386);
    expect(pokedex.every((entry) => BigInt(entry.seenCount) > 0n)).toBe(true);
    expect(pokedex.every((entry) => BigInt(entry.caughtCount) > 0n)).toBe(true);
  });

  it('provides a dense advanced collection with a full team and shiny examples', () => {
    const pokemon = createAdvancedShowcasePokemon();
    const team = pokemon.filter((entry) => entry.placementKind === 'TEAM');
    const shinies = pokemon.filter((entry) => entry.shiny);

    expect(pokemon.length).toBeGreaterThanOrEqual(30);
    expect(team).toHaveLength(6);
    expect(team.map((entry) => entry.slotNo)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(shinies.length).toBeGreaterThanOrEqual(6);
    expect(pokemon.some((entry) => entry.placementKind === 'BOX' && entry.boxNo === 3)).toBe(true);
  });

  it('exposes a high-level authenticated trainer profile for the Journey preview', () => {
    const session = getAdvancedShowcaseSession();

    expect(session.status).toBe('authenticated');
    if (session.status !== 'authenticated') return;

    expect(session.profile.trainerName).toBe('Aster Vale');
    expect(session.profile.trainerLevel).toBeGreaterThanOrEqual(50);
    expect(session.profile.team).toHaveLength(6);
    expect(session.profile.originRegionName).toBe('Kanto');
  });
});
