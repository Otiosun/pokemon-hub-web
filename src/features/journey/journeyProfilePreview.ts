import type { PlayerPortalProfile } from '../../player-api/playerPortalClient';
import type { OwnedPokemonPreview } from '../collection/ownedPokemonPreview';

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
  assetUrl?: string | null;
};

export type JourneyProfilePreview = {
  trainerName: string;
  trainerTitle: string;
  trainerId: string;
  publicVerificationId: string | null;
  originRegion: string;
  currentLocation: string;
  leadPokemon: OwnedPokemonPreview | null;
  badges: JourneyBadgePreview[];
  ownedPokemonCount: number | null;
  registeredSpeciesCount: number | null;
  teamSize: number | null;
  progressionPoints: string | null;
  personal: JourneyPersonalProfile;
};

export function createJourneyProfileView(
  playerProfile: PlayerPortalProfile | null,
): JourneyProfilePreview {
  return {
    trainerName: playerProfile?.trainerName?.trim() || 'Treinador',
    trainerTitle: playerProfile
      ? `Treinador · Nv. ${playerProfile.trainerLevel}`
      : 'Registro não conectado',
    trainerId: '—',
    publicVerificationId: null,
    originRegion: 'Não disponível',
    currentLocation: 'Não disponível',
    leadPokemon: null,
    badges: [],
    ownedPokemonCount: null,
    registeredSpeciesCount: null,
    teamSize: playerProfile?.team.length ?? null,
    progressionPoints: playerProfile?.progressionPoints ?? null,
    personal: {
      age: null,
      height: null,
      appearance: null,
      bio: null,
    },
  };
}

export function getJourneyProfilePreview(): JourneyProfilePreview {
  return createJourneyProfileView(null);
}
