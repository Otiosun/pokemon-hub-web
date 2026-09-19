import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getTrainerCardActionLabel,
  getTrainerCardEmissionReadiness,
  getTrainerCardEmissionStorageKey,
  hasTrainerCardBeenEmitted,
  mapProfileToZhouliaTrainerCardFields,
  markTrainerCardEmitted,
  type TrainerCardProfile,
} from './trainerCardEmissionState';

const profile: TrainerCardProfile = {
  trainerName: 'Enzo',
  trainerTitle: 'Explorador de Fronteiras',
  trainerId: 'ZHO-028419',
  publicVerificationId: 'tcv_0123456789ABCDEFGHIJKLMN',
  originRegion: 'Zhoulia',
  currentLocation: 'Vila dos Arrozais · Zhoulia',
  featuredFeat: 'Campeão — Copa da Primavera',
  leadPokemon: {
    instanceId: 'brasa-1',
    dex: 58,
    displayName: 'Growlithe',
    nickname: 'Brasa',
    level: 12,
    types: ['Fogo'],
  },
  badges: [],
  ownedPokemonCount: 1,
  registeredSpeciesCount: 1,
  teamSize: 1,
  progressionPoints: '0',
  personal: { age: null, height: null, appearance: null, bio: null },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('allows a fresh trainer to emit with Title and Feat still unconquered', () => {
    const freshTrainer = {
      ...profile,
      trainerTitle: '',
      featuredFeat: null,
    };
    const state = getTrainerCardEmissionReadiness(freshTrainer, 'blob:avatar');

    expect(state).toEqual({ ready: true, missing: [] });
    expect(mapProfileToZhouliaTrainerCardFields(freshTrainer)).toMatchObject({
      title: '',
      feat: '',
    });
  });

  it('does not substitute current location into an empty Feat', () => {
    const withoutFeat = { ...profile, featuredFeat: null, currentLocation: 'Route 1' };
    expect(mapProfileToZhouliaTrainerCardFields(withoutFeat).feat).toBe('');
  });

  it('requires a registered partner because Partner is basic Trainer Card data', () => {
    const withoutPartner = { ...profile, leadPokemon: null };
    expect(getTrainerCardEmissionReadiness(withoutPartner, 'blob:avatar').missing).toContain(
      'partner',
    );
  });

  it('requires a real Trainer ID instead of fabricating one', () => {
    const withoutId = { ...profile, trainerId: null };
    expect(getTrainerCardEmissionReadiness(withoutId, 'blob:avatar').missing).toContain('idNo');
    expect(hasTrainerCardBeenEmitted(null)).toBe(false);
  });

  it('becomes ready when all mandatory basic runtime data exists', () => {
    expect(getTrainerCardEmissionReadiness(profile, 'blob:avatar')).toEqual({
      ready: true,
      missing: [],
    });
  });

  it('uses Emitir only before the first Zhoulia issuance and Ver afterwards', () => {
    expect(getTrainerCardActionLabel({ isZhoulia: true, hasEmitted: false })).toBe(
      'EMITIR TRAINER CARD',
    );
    expect(getTrainerCardActionLabel({ isZhoulia: true, hasEmitted: true })).toBe(
      'VER TRAINER CARD',
    );
    expect(getTrainerCardActionLabel({ isZhoulia: false, hasEmitted: false })).toBe(
      'VER TRAINER CARD',
    );
  });

  it('keeps the issuance flag namespaced by trainer id and is SSR-safe', () => {
    expect(getTrainerCardEmissionStorageKey(' ZHO/028419 ')).toBe(
      'pokemon-hub:trainer-card:zhoulia:emitted:ZHO-028419',
    );
    if (typeof window === 'undefined') expect(hasTrainerCardBeenEmitted('ZHO-028419')).toBe(false);
  });

  it('treats blocked localStorage reads as not emitted instead of crashing the Journey', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('storage blocked');
        },
      },
    });

    expect(() => hasTrainerCardBeenEmitted('ZHO-028419')).not.toThrow();
    expect(hasTrainerCardBeenEmitted('ZHO-028419')).toBe(false);
  });

  it('keeps a successful emission successful when localStorage writes are blocked', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal(
      'CustomEvent',
      class TestCustomEvent {
        type: string;
        detail: unknown;
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type;
          this.detail = init?.detail;
        }
      },
    );
    vi.stubGlobal('window', {
      localStorage: {
        setItem: () => {
          throw new Error('storage blocked');
        },
      },
      dispatchEvent,
    });

    expect(() => markTrainerCardEmitted('ZHO-028419')).not.toThrow();
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
});
