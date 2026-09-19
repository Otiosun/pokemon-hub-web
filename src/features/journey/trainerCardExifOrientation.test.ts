import { describe, expect, it } from 'vitest';
import { readExifOrientation } from './trainerCardExifOrientation';

function buildExifJpeg(orientation: number) {
  const payload = new Uint8Array([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
    0x49, 0x49, 0x2a, 0x00, // little-endian TIFF header
    0x08, 0x00, 0x00, 0x00, // IFD0 offset
    0x01, 0x00, // one IFD entry
    0x12, 0x01, // Orientation tag 0x0112
    0x03, 0x00, // SHORT
    0x01, 0x00, 0x00, 0x00, // count = 1
    orientation, 0x00, 0x00, 0x00, // inline value
    0x00, 0x00, 0x00, 0x00, // next IFD
  ]);
  const segmentLength = payload.length + 2;
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1,
    (segmentLength >> 8) & 0xff,
    segmentLength & 0xff,
    ...payload,
    0xff, 0xd9,
  ]).buffer;
}

describe('Trainer Card EXIF orientation', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('reads JPEG EXIF orientation %i', (orientation) => {
    expect(readExifOrientation(buildExifJpeg(orientation))).toBe(orientation);
  });

  it('falls back safely for non-JPEG, truncated EXIF, and invalid orientation', () => {
    expect(readExifOrientation(new Uint8Array([1, 2, 3, 4]).buffer)).toBe(1);
    expect(readExifOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00]).buffer)).toBe(1);
    expect(readExifOrientation(buildExifJpeg(99))).toBe(1);
  });
});
