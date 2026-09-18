import type { JourneyProfilePreview } from './journeyProfilePreview';
import type { ZhouliaTrainerCardFields } from './trainerCardZhouliaCompositor';

export const TRAINER_CARD_EMITTED_EVENT = 'pokemon-hub:trainer-card:zhoulia:emitted';

export type TrainerCardMissingField = 'name' | 'title' | 'feat' | 'partner' | 'idNo' | 'photo';

export type TrainerCardEmissionReadiness = {
  ready: boolean;
  missing: TrainerCardMissingField[];
};

export type TrainerCardProfile = JourneyProfilePreview & {
  featuredFeat?: string | null;
};

function normalized(value: string | null | undefined) {
  return value?.trim() ?? '';
}

function safeKeyPart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

export function mapProfileToZhouliaTrainerCardFields(profile: TrainerCardProfile): ZhouliaTrainerCardFields {
  return {
    name: normalized(profile.trainerName),
    title: normalized(profile.trainerTitle),
    feat: normalized(profile.featuredFeat),
    partner: normalized(profile.leadPokemon?.nickname),
    idNo: normalized(profile.trainerId),
  };
}

export function getTrainerCardEmissionReadiness(
  profile: TrainerCardProfile,
  photoUrl: string | null | undefined,
): TrainerCardEmissionReadiness {
  const fields = mapProfileToZhouliaTrainerCardFields(profile);
  const missing: TrainerCardMissingField[] = [];

  if (!fields.name) missing.push('name');
  if (!fields.partner) missing.push('partner');
  if (!fields.idNo) missing.push('idNo');
  if (!normalized(photoUrl)) missing.push('photo');

  return { ready: missing.length === 0, missing };
}

export function getTrainerCardActionLabel({
  isZhoulia,
  hasEmitted,
}: {
  isZhoulia: boolean;
  hasEmitted: boolean;
}) {
  if (!isZhoulia) return 'VER TRAINER CARD';
  return hasEmitted ? 'VER TRAINER CARD' : 'EMITIR TRAINER CARD';
}

export function getTrainerCardEmissionStorageKey(trainerId: string) {
  return `pokemon-hub:trainer-card:zhoulia:emitted:${safeKeyPart(trainerId)}`;
}

export function hasTrainerCardBeenEmitted(trainerId: string) {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getTrainerCardEmissionStorageKey(trainerId)) === '1';
  } catch {
    return false;
  }
}

export function markTrainerCardEmitted(trainerId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getTrainerCardEmissionStorageKey(trainerId), '1');
  } catch {
    // Persistence is best-effort; a generated PNG remains a successful emission.
  }
  window.dispatchEvent(new CustomEvent(TRAINER_CARD_EMITTED_EVENT, { detail: { trainerId } }));
}