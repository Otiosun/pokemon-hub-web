import type { JourneyProfilePreview } from './journeyProfilePreview';
import type { ZhouliaTrainerCardFields } from './trainerCardZhouliaCompositor';

export type TrainerCardMissingField = 'name' | 'title' | 'feat' | 'partner' | 'idNo' | 'photo';

export type TrainerCardEmissionReadiness = {
  ready: boolean;
  missing: TrainerCardMissingField[];
};

function normalized(value: string | null | undefined) {
  return value?.trim() ?? '';
}

export function mapProfileToZhouliaTrainerCardFields(profile: JourneyProfilePreview): ZhouliaTrainerCardFields {
  return {
    name: normalized(profile.trainerName),
    title: normalized(profile.trainerTitle),
    feat: normalized(profile.featuredFeat),
    partner: normalized(profile.leadPokemon?.nickname),
    idNo: normalized(profile.trainerId),
  };
}

export function getTrainerCardEmissionReadiness(
  profile: JourneyProfilePreview,
  photoUrl: string | null | undefined,
): TrainerCardEmissionReadiness {
  const fields = mapProfileToZhouliaTrainerCardFields(profile);
  const missing: TrainerCardMissingField[] = [];

  if (!fields.name) missing.push('name');
  if (!fields.title) missing.push('title');
  if (!fields.feat) missing.push('feat');
  if (!fields.partner) missing.push('partner');
  if (!fields.idNo) missing.push('idNo');
  if (!normalized(photoUrl)) missing.push('photo');

  return { ready: missing.length === 0, missing };
}
