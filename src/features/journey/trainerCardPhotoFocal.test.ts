import { describe, expect, it } from 'vitest';
import {
  getTrainerPhotoFacePlacement,
  getTrainerPhotoFallback,
  getTrainerPhotoPlacementFallback,
} from './trainerCardPhotoFocal';

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

describe('trainer card photo placement', () => {
  it('adds a small zoom and stronger upward bias for unusually tall photos', () => {
    expect(getTrainerPhotoPlacementFallback(300, 700)).toEqual({
      x: 0.5,
      y: 0.43,
      zoom: 1.08,
      source: 'orientation-fallback',
    });
  });

  it('keeps ordinary portrait photos at neutral zoom', () => {
    expect(getTrainerPhotoPlacementFallback(800, 1000)).toEqual({
      x: 0.5,
      y: 0.5,
      zoom: 1,
      source: 'orientation-fallback',
    });
  });

  it('centers a detected face while leaving room below it for shoulders', () => {
    const placement = getTrainerPhotoFacePlacement(1000, 1400, {
      x: 350,
      y: 180,
      width: 260,
      height: 260,
    });

    expect(placement.source).toBe('face-detector');
    expect(placement.x).toBeCloseTo(0.48, 2);
    expect(placement.y).toBeGreaterThan(0.34);
    expect(placement.y).toBeLessThan(0.5);
    expect(placement.zoom).toBeGreaterThanOrEqual(1);
    expect(placement.zoom).toBeLessThanOrEqual(1.55);
  });

  it('clamps off-center faces so the crop cannot chase a face into the frame edge', () => {
    const placement = getTrainerPhotoFacePlacement(1000, 1000, {
      x: 0,
      y: 120,
      width: 180,
      height: 180,
    });

    expect(placement.x).toBe(0.24);
    expect(placement.zoom).toBeGreaterThan(1);
  });
});
