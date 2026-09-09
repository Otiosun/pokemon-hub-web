import { describe, expect, it } from 'vitest';
import { OWNED_POKEMON_PREVIEW } from '../collection/ownedPokemonPreview';
import { countRegisteredSpeciesPreview, getJourneyProfilePreview } from './journeyProfilePreview';

describe('journey profile preview', () => {
  it('derives collection totals instead of duplicating arbitrary profile numbers', () => {
    const profile = getJourneyProfilePreview();
    expect(profile.ownedPokemonCount).toBe(OWNED_POKEMON_PREVIEW.length);
    expect(profile.registeredSpeciesCount).toBe(countRegisteredSpeciesPreview());
    expect(profile.registeredSpeciesCount).toBe(36);
  });

  it('keeps unsupported personal presentation fields empty', () => {
    expect(getJourneyProfilePreview().personal).toEqual({
      age: null,
      height: null,
      appearance: null,
      bio: null,
    });
  });

  it('exposes trainer-license identity without fabricating badge progress', () => {
    const profile = getJourneyProfilePreview();
    expect(profile.trainerTitle).toBe('Treinador iniciante');
    expect(profile.trainerId).toBe('KNT-028419');
    expect(profile.badges).toHaveLength(8);
    expect(profile.badges.every((badge) => badge.earned === false)).toBe(true);
  });
});
