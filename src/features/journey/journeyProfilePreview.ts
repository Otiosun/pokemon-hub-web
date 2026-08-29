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

export type JourneyBadgePreview = {
  key: string;
  name: string;
  earned: boolean;
};

export type JourneyProfilePreview = {
  trainerName: string;
  trainerTitle: string;
  trainerId: string;
  originRegion: string;
  currentLocation: string;
  leadPokemon: OwnedPokemonPreview | null;
  badges: JourneyBadgePreview[];
  ownedPokemonCount: number;
  registeredSpeciesCount: number;
  personal: JourneyPersonalProfile;
};

const KANTO_BADGE_PREVIEW: JourneyBadgePreview[] = [
  { key: 'boulder', name: 'Boulder Badge', earned: false },
  { key: 'cascade', name: 'Cascade Badge', earned: false },
  { key: 'thunder', name: 'Thunder Badge', earned: false },
  { key: 'rainbow', name: 'Rainbow Badge', earned: false },
  { key: 'soul', name: 'Soul Badge', earned: false },
  { key: 'marsh', name: 'Marsh Badge', earned: false },
  { key: 'volcano', name: 'Volcano Badge', earned: false },
  { key: 'earth', name: 'Earth Badge', earned: false },
];

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
    trainerTitle: 'Treinador iniciante',
    trainerId: 'KNT-028419',
    originRegion: 'Kanto',
    currentLocation: 'Route 1',
    leadPokemon: getTeamPreview()[0] ?? null,
    badges: KANTO_BADGE_PREVIEW.map((badge) => ({ ...badge })),
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
