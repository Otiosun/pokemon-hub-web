import { describe, expect, it } from 'vitest';
import { createTrainerCardVerificationPresentation } from './trainerCardVerificationPresentation';

const PUBLIC_ID = 'tcv_A1b2C3d4E5f6G7h8I9j0K1l2';

describe('trainer card verification presentation', () => {
  it('builds the official server-side verification URL from an opaque public id', () => {
    expect(
      createTrainerCardVerificationPresentation({
        publicId: PUBLIC_ID,
        verificationOrigin: 'https://verify.example.com',
      }),
    ).toEqual({
      publicId: PUBLIC_ID,
      verificationUrl: `https://verify.example.com/public/v1/trainer-cards/${PUBLIC_ID}/verify`,
      watermarkLabel: `VERIFICÁVEL • ${PUBLIC_ID}`,
    });
  });

  it.each([
    undefined,
    '',
    'KNT-028419',
    'tcv_short',
    'tcv_A1b2C3d4E5f6G7h8I9j0K1l!',
  ])('fails closed when the public verification id is absent or malformed: %s', (publicId) => {
    expect(
      createTrainerCardVerificationPresentation({
        publicId,
        verificationOrigin: 'https://verify.example.com',
      }),
    ).toBeNull();
  });

  it.each([
    undefined,
    '',
    'http://verify.example.com',
    'https://localhost:3000',
    'https://127.0.0.1',
    'https://user:pass@verify.example.com',
    'https://verify.example.com/path',
    'https://verify.example.com?next=evil',
    'https://verify.example.com/#fragment',
  ])('fails closed when the configured official origin is unsafe or not an origin: %s', (verificationOrigin) => {
    expect(
      createTrainerCardVerificationPresentation({
        publicId: PUBLIC_ID,
        verificationOrigin,
      }),
    ).toBeNull();
  });

  it('normalizes only a trailing slash on an otherwise valid HTTPS origin', () => {
    expect(
      createTrainerCardVerificationPresentation({
        publicId: PUBLIC_ID,
        verificationOrigin: 'https://verify.example.com/',
      })?.verificationUrl,
    ).toBe(`https://verify.example.com/public/v1/trainer-cards/${PUBLIC_ID}/verify`);
  });
});
