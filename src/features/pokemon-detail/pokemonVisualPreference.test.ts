import { describe, expect, it } from 'vitest';
import {
  readPokemonVisualPreference,
  rememberPokemonVisualPreference,
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
  it('shares an explicit 3D preference across pokemon detail surfaces', () => {
    const storage = createStorage();

    rememberPokemonVisualPreference('3d', storage);

    expect(readPokemonVisualPreference('2d', storage)).toBe('3d');
    expect(readPokemonVisualPreference('3d', storage)).toBe('3d');
  });

  it('keeps each surface fallback until the trainer explicitly chooses a mode', () => {
    const storage = createStorage();

    expect(readPokemonVisualPreference('2d', storage)).toBe('2d');
    expect(readPokemonVisualPreference('3d', storage)).toBe('3d');
  });

  it('ignores an invalid stored value', () => {
    const storage = createStorage();
    storage.setItem('pokemon-beyond:pokemon-visual-mode', 'cinema');

    expect(readPokemonVisualPreference('2d', storage)).toBe('2d');
  });
});
