import { describe, expect, it } from 'vitest';
import { getTrainerPhotoFallback } from './trainerCardPhotoFocal';

describe('trainer card photo fallback', () => {
  it('keeps ordinary portrait photos close to centered crop', () => {
    expect(getTrainerPhotoFallback(401, 509)).toEqual({
      x: 0.5,
      y: 0.5,
      source: 'orientation-fallback',
    });
  });

  it('biases very tall portraits slightly upward without aggressive zoom', () => {
    expect(getTrainerPhotoFallback(320, 640)).toEqual({
      x: 0.5,
      y: 0.46,
      source: 'orientation-fallback',
    });
  });

  it('keeps very wide photos near center so cover performs the minimum crop', () => {
    expect(getTrainerPhotoFallback(1600, 800)).toEqual({
      x: 0.5,
      y: 0.48,
      source: 'orientation-fallback',
    });
  });

  it('has a safe fallback for missing dimensions', () => {
    expect(getTrainerPhotoFallback(0, 0)).toEqual({
      x: 0.5,
      y: 0.5,
      source: 'orientation-fallback',
    });
  });
});
