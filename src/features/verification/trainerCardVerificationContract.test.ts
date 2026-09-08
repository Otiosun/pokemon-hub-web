import { describe, expect, it } from 'vitest';
import { getJourneyProfilePreview } from '../journey/journeyProfilePreview';
import {
  buildTrainerCardVerificationPath,
  parseTrainerCardVerificationPath,
} from './trainerCardVerificationRoute';

const VALID_PUBLIC_ID = 'tcv_0123456789ABCDEFGHIJKLMN';

describe('trainer card public verification contract', () => {
  it('keeps the game Trainer ID separate from the signed public verification ID', () => {
    const profile = getJourneyProfilePreview();

    expect(profile.trainerId).toBe('KNT-028419');
    expect(profile.publicVerificationId).toBeNull();
  });

  it('builds only the controlled same-origin verification path for a valid opaque public ID', () => {
    expect(buildTrainerCardVerificationPath(VALID_PUBLIC_ID)).toBe(
      `/verificar/treinador/${VALID_PUBLIC_ID}`,
    );
  });

  it.each([
    '',
    'KNT-028419',
    'tcv_short',
    'tcv_0123456789ABCDEFGHIJKLM!',
    'https://evil.example/tcv_0123456789ABCDEFGHIJKLMN',
  ])('rejects malformed or user-controlled verification identifiers: %s', (value) => {
    expect(() => buildTrainerCardVerificationPath(value)).toThrow();
  });

  it('parses only the exact public verification route', () => {
    expect(parseTrainerCardVerificationPath(`/verificar/treinador/${VALID_PUBLIC_ID}`)).toBe(
      VALID_PUBLIC_ID,
    );
    expect(parseTrainerCardVerificationPath(`/verificar/treinador/${VALID_PUBLIC_ID}/extra`)).toBeNull();
    expect(parseTrainerCardVerificationPath(`/jornada/${VALID_PUBLIC_ID}`)).toBeNull();
  });
});
