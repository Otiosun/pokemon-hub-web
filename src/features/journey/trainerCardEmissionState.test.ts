import { describe, expect, it } from 'vitest';
import type { JourneyProfilePreview } from './journeyProfilePreview';
import {
  getTrainerCardActionLabel,
  getTrainerCardEmissionReadiness,
  mapProfileToZhouliaTrainerCardFields,
} from './trainerCardEmissionState';

const profile: JourneyProfilePreview = {
  trainerName: 'Enzo',
  trainerTitle: 'Explorador de Fronteiras',
  trainerId: 'ZHO-028419',
  publicVerificationId: null,
  originRegion: 'Zhoulia',
  currentLocation: '—',
  featuredFeat: 'Campeão — Copa da Primavera',
  leadPokemon: {
    instanceId: 'brasa-1',
    dex: 58,
    species: 'Growlithe',
    nickname: 'Brasa',
    level: 12,
    types: ['Fogo'],
    sex: 'M',
    favorite: true,
    shiny: false,
    box: 'Parceiros',
    teamSlot: 1,
  },
  badges: [],
  ownedPokemonCount: 1,
  registeredSpeciesCount: 1,
  personal: { age: null, height: null, appearance: null, bio: null },
};

describe('Trainer Card emission readiness', () => {
  it('maps only the five canonical card fields', () => {
    expect(mapProfileToZhouliaTrainerCardFields(profile)).toEqual({
      name: 'Enzo',
      title: 'Explorador de Fronteiras',
      feat: 'Campeão — Copa da Primavera',
      partner: 'Brasa',
      idNo: 'ZHO-028419',
    });
  });

  it('requires a real photo instead of emitting a broken placeholder', () => {
    expect(getTrainerCardEmissionReadiness(profile, null)).toEqual({
      ready: false,
      missing: ['photo'],
    });
  });

  it('requires authoritative Feat data and does not substitute current location', () => {
    const withoutFeat = { ...profile, featuredFeat: null };
    const state = getTrainerCardEmissionReadiness(withoutFeat, 'blob:avatar');
    expect(state.ready).toBe(false);
    expect(state.missing).toContain('feat');
    expect(mapProfileToZhouliaTrainerCardFields(withoutFeat).feat).toBe('');
  });

  it('requires a registered partner because Partner is canonical', () => {
    const withoutPartner = { ...profile, leadPokemon: null };
    expect(getTrainerCardEmissionReadiness(withoutPartner, 'blob:avatar').missing).toContain('partner');
  });

  it('becomes ready only when all canonical runtime data exists', () => {
    expect(getTrainerCardEmissionReadiness(profile, 'blob:avatar')).toEqual({
      ready: true,
      missing: [],
    });
  });

  it('uses Emitir only before the first Zhoulia issuance and Ver afterwards', () => {
    expect(getTrainerCardActionLabel({ isZhoulia: true, hasEmitted: false })).toBe('EMITIR TRAINER CARD');
    expect(getTrainerCardActionLabel({ isZhoulia: true, hasEmitted: true })).toBe('VER TRAINER CARD');
    expect(getTrainerCardActionLabel({ isZhoulia: false, hasEmitted: false })).toBe('VER TRAINER CARD');
  });
});
