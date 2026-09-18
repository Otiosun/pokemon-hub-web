import { describe, expect, it } from 'vitest';
import {
  hubSectionForPath,
  readHubDestinations,
  shouldTraverseBackForUp,
} from './hubNavigationSession';

describe('hub navigation session', () => {
  it('classifies Journey, Pokédex and the Box domain without swallowing legacy Field Dex routes', () => {
    expect(hubSectionForPath('/jornada')).toBe('journey');
    expect(hubSectionForPath('/pokedex')).toBe('pokedex');
    expect(hubSectionForPath('/pokedex/025')).toBe('pokedex');
    expect(hubSectionForPath('/pokemon')).toBe('box');
    expect(hubSectionForPath('/pokemon?species=4')).toBe('box');
    expect(hubSectionForPath('/pokemon/pkm-charmander-a1')).toBe('box');
    expect(hubSectionForPath('/team')).toBe('box');
    expect(hubSectionForPath('/team/edit?slot=2')).toBe('box');
    expect(hubSectionForPath('/champion-store')).toBe('store');
    expect(hubSectionForPath('/pokemon/demo-charmander')).toBeNull();
  });

  it('has stable roots when browser session storage is unavailable', () => {
    expect(readHubDestinations()).toEqual({
      journey: '/jornada',
      pokedex: '/pokedex',
      box: '/pokemon',
      store: '/champion-store',
    });
  });

  it('uses browser Back for Up only when that exact parent really exists behind the record', () => {
    expect(shouldTraverseBackForUp('/pokemon?species=4', true, '/pokemon?species=4')).toBe(true);
    expect(shouldTraverseBackForUp('/pokemon', false, '/pokemon')).toBe(false);
    expect(shouldTraverseBackForUp('/team', true, '/pokemon')).toBe(false);
  });
});
