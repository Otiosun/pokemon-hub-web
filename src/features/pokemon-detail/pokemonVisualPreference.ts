export type PokemonVisualPreference = '2d' | '3d';

export type PokemonVisualPreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'pokemon-beyond:pokemon-visual-mode';

function browserStorage(): PokemonVisualPreferenceStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function readPokemonVisualPreference(
  fallback: PokemonVisualPreference,
  storage: PokemonVisualPreferenceStorage | undefined = browserStorage(),
): PokemonVisualPreference {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return value === '2d' || value === '3d' ? value : fallback;
  } catch {
    return fallback;
  }
}

export function rememberPokemonVisualPreference(
  preference: PokemonVisualPreference,
  storage: PokemonVisualPreferenceStorage | undefined = browserStorage(),
) {
  try {
    storage?.setItem(STORAGE_KEY, preference);
  } catch {
    // A preference must never block the pokemon record if browser storage is unavailable.
  }
}
