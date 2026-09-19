import { describe, expect, it } from 'vitest';
import {
  PHOTO_CLIP_POLYGON_MASTER,
  PHOTO_SLOT_MASTER,
  computeTrainerPhotoCrop,
  cropToTrainerPhotoPlacement,
} from './trainerCardPhotoCrop';

function expectValidCrop(
  sourceWidth: number,
  sourceHeight: number,
  result: ReturnType<typeof computeTrainerPhotoCrop>,
) {
  expect(result.crop.w / result.crop.h).toBeCloseTo(PHOTO_SLOT_MASTER.ratio, 8);
  expect(result.crop.x).toBeGreaterThanOrEqual(0);
  expect(result.crop.y).toBeGreaterThanOrEqual(0);
  expect(result.crop.x + result.crop.w).toBeLessThanOrEqual(sourceWidth);
  expect(result.crop.y + result.crop.h).toBeLessThanOrEqual(sourceHeight);
}

describe('Zhoulia trainer card photo crop', () => {
  it('locks the canonical slot geometry from the handoff', () => {
    expect(PHOTO_CLIP_POLYGON_MASTER).toEqual([
      [828.64, 218.71],
      [1223.64, 218.71],
      [1238.72, 233.79],
      [1238.72, 670.27],
      [1193.47, 715.52],
      [822.04, 715.52],
      [809.79, 703.26],
      [809.79, 232.85],
    ]);
    expect(PHOTO_SLOT_MASTER.width).toBeCloseTo(428.93, 5);
    expect(PHOTO_SLOT_MASTER.height).toBeCloseTo(496.81, 5);
  });

  it('builds one source crop with exactly the slot aspect ratio', () => {
    const result = computeTrainerPhotoCrop({
      width: 1200,
      height: 1600,
      faces: [{ x: 420, y: 260, w: 300, h: 300, score: 1 }],
    });

    expect(result.method).toBe('face');
    expectValidCrop(1200, 1600, result);
  });

  it.each([
    { label: 'landscape', width: 1600, height: 900 },
    { label: 'square', width: 1000, height: 1000 },
    { label: 'portrait', width: 900, height: 1600 },
  ])('keeps a $label photo inside source bounds with the exact slot ratio', ({ width, height }) => {
    const result = computeTrainerPhotoCrop({ width, height, faces: [] });
    expect(result.method).toBe('center');
    expectValidCrop(width, height, result);
  });

  it('keeps two meaningful nearby faces when both fit the approved group safe area', () => {
    const result = computeTrainerPhotoCrop({
      width: 1200,
      height: 1600,
      faces: [
        { x: 400, y: 250, w: 220, h: 220, score: 1 },
        { x: 610, y: 260, w: 200, h: 200, score: 1 },
      ],
    });

    expect(result.method).toBe('face-group');
    expect(result.primaryFaces).toEqual([0, 1]);
    expectValidCrop(1200, 1600, result);
  });

  it('falls back deterministically to the dominant face when a second face would make the group unsafe', () => {
    const result = computeTrainerPhotoCrop({
      width: 1200,
      height: 1600,
      faces: [
        { x: 500, y: 250, w: 240, h: 240, score: 1 },
        { x: 20, y: 250, w: 220, h: 220, score: 1 },
      ],
    });

    expect(result.method).toBe('face');
    expect(result.primaryFaces).toEqual([0]);
    expectValidCrop(1200, 1600, result);
  });

  it('uses a strong subject signal when no face is available', () => {
    const result = computeTrainerPhotoCrop({
      width: 1200,
      height: 1600,
      faces: [],
      subjectBox: { x: 350, y: 250, w: 450, h: 700 },
      subjectCenter: { x: 575, y: 600 },
      subjectConcentration: 0.5,
    });

    expect(result.method).toBe('subject');
    expectValidCrop(1200, 1600, result);
  });

  it('rejects a weak subject signal and falls back to center crop', () => {
    const result = computeTrainerPhotoCrop({
      width: 1200,
      height: 1600,
      faces: [],
      subjectBox: { x: 350, y: 250, w: 450, h: 700 },
      subjectCenter: { x: 575, y: 600 },
      subjectConcentration: 0.079,
    });

    expect(result.method).toBe('center');
    expectValidCrop(1200, 1600, result);
  });

  it('falls back to center crop when there is no usable face or subject signal', () => {
    const result = computeTrainerPhotoCrop({ width: 1600, height: 900, faces: [] });
    expect(result.method).toBe('center');
    expectValidCrop(1600, 900, result);
  });

  it('rejects zero or negative source dimensions instead of generating invalid SVG geometry', () => {
    expect(() => computeTrainerPhotoCrop({ width: 0, height: 900, faces: [] })).toThrow('Invalid trainer photo source dimensions');
    expect(() => computeTrainerPhotoCrop({ width: 1200, height: -1, faces: [] })).toThrow('Invalid trainer photo source dimensions');
  });

  it('maps the original source image directly under the polygon without a second crop', () => {
    const result = computeTrainerPhotoCrop({ width: 1200, height: 1600, faces: [] });
    const placement = cropToTrainerPhotoPlacement(1200, 1600, result.crop);

    expect(placement.preserveAspectRatio).toBe('none');
    expect(placement.clipPath).toBe('url(#trainer-photo-clip)');
    expect(placement.x + result.crop.x * placement.scale).toBeCloseTo(PHOTO_SLOT_MASTER.x0, 6);
    expect(placement.y + result.crop.y * placement.scale).toBeCloseTo(PHOTO_SLOT_MASTER.y0, 6);
    expect(result.crop.w * placement.scale).toBeCloseTo(PHOTO_SLOT_MASTER.width, 6);
  });

  it('keeps manual zoom and pan bounded to the approved micro-override range', () => {
    const result = computeTrainerPhotoCrop({
      width: 1200,
      height: 1600,
      faces: [],
      override: { zoom: 99, panX: 99, panY: -99 },
    });

    expect(result.overrideApplied).toEqual({ zoom: 1.35, panX: 0.25, panY: -0.25 });
    expectValidCrop(1200, 1600, result);
  });
});
