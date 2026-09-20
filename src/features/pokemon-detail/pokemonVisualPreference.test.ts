import { describe, expect, it } from 'vitest';
import {
  readOwnedPokemonVisualPreference,
  readPokedexVisualPreference,
  rememberOwnedPokemonVisualPreference,
  rememberPokedexVisualPreference,
  type PokemonVisualPreferenceStorage,
} from './pokemonVisualPreference';

function createStorage(): PokemonVisualPreferenceStorage {
  const values = new Map<string, string>();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe('pokemon visual preference', () => {
  it('keeps Pokédex and owned-Pokemon preferences isolated', () => {
    const storage = createStorage();

    rememberOwnedPokemonVisualPreference('3d', storage);
    rememberPokedexVisualPreference('2d', storage);

    expect(readOwnedPokemonVisualPreference('2d', storage)).toBe('3d');
    expect(readPokedexVisualPreference('3d', storage)).toBe('2d');
  });

  it('keeps each surface fallback until the trainer explicitly chooses a mode', () => {
    const storage = createStorage();

    expect(readOwnedPokemonVisualPreference('2d', storage)).toBe('2d');
    expect(readPokedexVisualPreference('3d', storage)).toBe('3d');
  });

  it('ignores invalid stored values independently', () => {
    const storage = createStorage();
    storage.setItem('pokemon-beyond:owned-pokemon-visual-mode', 'cinema');
    storage.setItem('pokemon-beyond:pokedex-visual-mode', 'hologram');

    expect(readOwnedPokemonVisualPreference('2d', storage)).toBe('2d');
    expect(readPokedexVisualPreference('3d', storage)).toBe('3d');
  });
});
