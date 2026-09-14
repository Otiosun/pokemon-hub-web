import type { PlayerPortalProfile } from '../../player-api/playerPortalClient';
import { ADVANCED_SHOWCASE_JOURNEY, isAdvancedShowcaseActive } from '../../showcase/advancedShowcase';

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

export type JourneyLeadPokemonView = {
  instanceId: string;
  dex: number;
  displayName: string;
  /** Transitional compatibility label for legacy Trainer Card components. */
  nickname: string;
  level: number;
  types: string[];
};

export type JourneyProfilePreview = {
  trainerName: string;
  trainerTitle: string;
  trainerId: string;
  publicVerificationId: string | null;
  originRegion: string;
  currentLocation: string;
  leadPokemon: JourneyLeadPokemonView | null;
  badges: JourneyBadgePreview[];
  ownedPokemonCount: number | null;
  registeredSpeciesCount: number | null;
  teamSize: number | null;
  progressionPoints: string | null;
  personal: JourneyPersonalProfile;
};

function resolveLeadPokemon(playerProfile: PlayerPortalProfile | null): JourneyLeadPokemonView | null {
  if (!playerProfile || playerProfile.team.length === 0) return null;

  const lead = [...playerProfile.team].sort((left, right) => left.slotNo - right.slotNo)[0];
  if (lead === undefined || lead.displayName === null || lead.nationalDex === null) return null;

  return {
    instanceId: lead.pokemonInstanceId,
    dex: lead.nationalDex,
    displayName: lead.displayName,
    nickname: lead.displayName,
    level: lead.level,
    types: [...lead.typeNames],
  };
}

export function createJourneyProfileView(
  playerProfile: PlayerPortalProfile | null,
): JourneyProfilePreview {
  const baseProfile: JourneyProfilePreview = {
    trainerName: playerProfile?.trainerName?.trim() || 'Treinador',
    trainerTitle: playerProfile
      ? `Treinador · Nv. ${playerProfile.trainerLevel}`
      : 'Registro não conectado',
    trainerId: '—',
    publicVerificationId: null,
    originRegion: playerProfile?.originRegionName ?? 'Não disponível',
    currentLocation: 'Não disponível',
    leadPokemon: resolveLeadPokemon(playerProfile),
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

  if (!isAdvancedShowcaseActive()) return baseProfile;

  return {
    ...baseProfile,
    trainerId: ADVANCED_SHOWCASE_JOURNEY.trainerId,
    publicVerificationId: ADVANCED_SHOWCASE_JOURNEY.publicVerificationId,
    currentLocation: ADVANCED_SHOWCASE_JOURNEY.currentLocation,
    badges: ADVANCED_SHOWCASE_JOURNEY.badges.map((badge) => ({ ...badge })),
    ownedPokemonCount: ADVANCED_SHOWCASE_JOURNEY.ownedPokemonCount,
    registeredSpeciesCount: ADVANCED_SHOWCASE_JOURNEY.registeredSpeciesCount,
    personal: { ...ADVANCED_SHOWCASE_JOURNEY.personal },
  };
}

export function getJourneyProfilePreview(): JourneyProfilePreview {
  return createJourneyProfileView(null);
}
