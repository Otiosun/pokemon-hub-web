export type PokemonVisualPreference = '2d' | '3d';

export type PokemonVisualPreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

const OWNED_POKEMON_STORAGE_KEY = 'pokemon-beyond:owned-pokemon-visual-mode';
const POKEDEX_STORAGE_KEY = 'pokemon-beyond:pokedex-visual-mode';

function browserStorage(): PokemonVisualPreferenceStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function readPreference(
  storageKey: string,
  fallback: PokemonVisualPreference,
  storage: PokemonVisualPreferenceStorage | undefined = browserStorage(),
): PokemonVisualPreference {
  try {
    const value = storage?.getItem(storageKey);
    return value === '2d' || value === '3d' ? value : fallback;
  } catch {
    return fallback;
  }
}

function rememberPreference(
  storageKey: string,
  preference: PokemonVisualPreference,
  storage: PokemonVisualPreferenceStorage | undefined = browserStorage(),
) {
  try {
    storage?.setItem(storageKey, preference);
  } catch {
    // A preference must never block a pokemon record if browser storage is unavailable.
  }
}

export function readOwnedPokemonVisualPreference(
  fallback: PokemonVisualPreference,
  storage?: PokemonVisualPreferenceStorage,
) {
  return readPreference(OWNED_POKEMON_STORAGE_KEY, fallback, storage);
}

export function rememberOwnedPokemonVisualPreference(
  preference: PokemonVisualPreference,
  storage?: PokemonVisualPreferenceStorage,
) {
  rememberPreference(OWNED_POKEMON_STORAGE_KEY, preference, storage);
}

export function readPokedexVisualPreference(
  fallback: PokemonVisualPreference,
  storage?: PokemonVisualPreferenceStorage,
) {
  return readPreference(POKEDEX_STORAGE_KEY, fallback, storage);
}

export function rememberPokedexVisualPreference(
  preference: PokemonVisualPreference,
  storage?: PokemonVisualPreferenceStorage,
) {
  rememberPreference(POKEDEX_STORAGE_KEY, preference, storage);
}

// Compatibility for callers outside the product surfaces. The legacy generic preference
// now maps to the owned-Pokemon context instead of coupling Pokédex and collection state.
export function readPokemonVisualPreference(
  fallback: PokemonVisualPreference,
  storage?: PokemonVisualPreferenceStorage,
) {
  return readOwnedPokemonVisualPreference(fallback, storage);
}

export function rememberPokemonVisualPreference(
  preference: PokemonVisualPreference,
  storage?: PokemonVisualPreferenceStorage,
) {
  rememberOwnedPokemonVisualPreference(preference, storage);
}
