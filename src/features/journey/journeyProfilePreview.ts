import {
  DEFAULT_PLAYER_PORTAL_PROFILE_CUSTOMIZATION,
  type PlayerPortalProfile,
} from '../../player-api/playerPortalClient';
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
  shiny: boolean;
  formSlug: string | null;
  speciesSlug: string | null;
};

export type JourneyProfilePreview = {
  trainerName: string;
  trainerTitle: string;
  accent: 'teal' | 'gold' | 'violet' | 'crimson' | 'blue';
  trainerId: string | null;
  publicVerificationId: string | null;
  originRegion: string | null;
  currentLocation: string | null;
  leadPokemon: JourneyLeadPokemonView | null;
  badges: JourneyBadgePreview[];
  ownedPokemonCount: number | null;
  registeredSpeciesCount: number | null;
  teamSize: number | null;
  progressionPoints: string | null;
  personal: JourneyPersonalProfile;
};

export type JourneyAuthoritativeSnapshot = {
  currentLocation: string | null;
  ownedPokemonCount: number | null;
  registeredSpeciesCount: number | null;
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
    shiny: lead.shiny,
    formSlug: lead.formSlug ?? null,
    speciesSlug: lead.speciesSlug ?? null,
  };
}

export function createJourneyProfileView(
  playerProfile: PlayerPortalProfile | null,
  authoritative: JourneyAuthoritativeSnapshot = {
    currentLocation: null,
    ownedPokemonCount: null,
    registeredSpeciesCount: null,
  },
): JourneyProfilePreview {
  const customization =
    playerProfile?.profileCustomization ?? DEFAULT_PLAYER_PORTAL_PROFILE_CUSTOMIZATION;
  const baseProfile: JourneyProfilePreview = {
    trainerName: playerProfile?.trainerName?.trim() || 'Treinador',
    trainerTitle:
      customization.title ??
      (playerProfile ? `Treinador · Nv. ${playerProfile.trainerLevel}` : 'Registro não conectado'),
    accent: customization.accent,
    trainerId: null,
    publicVerificationId: null,
    originRegion: playerProfile?.originRegionName ?? null,
    currentLocation: authoritative.currentLocation,
    leadPokemon: resolveLeadPokemon(playerProfile),
    badges: [],
    ownedPokemonCount: authoritative.ownedPokemonCount,
    registeredSpeciesCount: authoritative.registeredSpeciesCount,
    teamSize: playerProfile?.team.length ?? null,
    progressionPoints: playerProfile?.progressionPoints ?? null,
    personal: {
      age: customization.age,
      height: customization.height,
      appearance: customization.appearance,
      bio: customization.bio,
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
  };
}

export function getJourneyProfilePreview(): JourneyProfilePreview {
  return createJourneyProfileView(null);
}
