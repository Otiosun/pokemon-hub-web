import {
  getTeamPreview,
  OWNED_POKEMON_PREVIEW,
  type OwnedPokemonPreview,
} from '../collection/ownedPokemonPreview';
import { getSpeciesPlayerStatePreview } from '../pokedex/speciesPlayerStatePreview';

export type JourneyPersonalProfile = {
  age: number | null;
  height: string | null;
  appearance: string | null;
  bio: string | null;
};

export type JourneyProfilePreview = {
  trainerName: string;
  originRegion: string;
  currentLocation: string;
  leadPokemon: OwnedPokemonPreview | null;
  ownedPokemonCount: number;
  registeredSpeciesCount: number;
  personal: JourneyPersonalProfile;
};

export function countRegisteredSpeciesPreview() {
  let total = 0;
  for (let dex = 1; dex <= 386; dex += 1) {
    if (getSpeciesPlayerStatePreview(dex).discovery !== 'unknown') total += 1;
  }
  return total;
}

export function getJourneyProfilePreview(): JourneyProfilePreview {
  return {
    trainerName: 'Whatever',
    originRegion: 'Kanto',
    currentLocation: 'Route 1',
    leadPokemon: getTeamPreview()[0] ?? null,
    ownedPokemonCount: OWNED_POKEMON_PREVIEW.length,
    registeredSpeciesCount: countRegisteredSpeciesPreview(),
    personal: {
      age: null,
      height: null,
      appearance: null,
      bio: null,
    },
  };
}
