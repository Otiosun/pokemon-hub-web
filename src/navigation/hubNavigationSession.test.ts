import { describe, expect, it } from 'vitest';
import { hubSectionForPath, readHubDestinations } from './hubNavigationSession';

describe('hub navigation session', () => {
  it('classifies the three product sections without swallowing legacy Field Dex routes', () => {
    expect(hubSectionForPath('/pokedex')).toBe('pokedex');
    expect(hubSectionForPath('/pokedex/025')).toBe('pokedex');
    expect(hubSectionForPath('/pokemon')).toBe('pokemon');
    expect(hubSectionForPath('/pokemon/pkm-charmander-a1')).toBe('pokemon');
    expect(hubSectionForPath('/pokemon/demo-charmander')).toBeNull();
    expect(hubSectionForPath('/team')).toBe('team');
    expect(hubSectionForPath('/team/edit')).toBe('team');
  });

  it('has stable roots when browser session storage is unavailable', () => {
    expect(readHubDestinations()).toEqual({
      pokedex: '/pokedex',
      pokemon: '/pokemon',
      team: '/team',
    });
  });
});
