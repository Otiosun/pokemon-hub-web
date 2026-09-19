export type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const DEFAULT_ORIENTATION: ExifOrientation = 1;

function isExifOrientation(value: number): value is ExifOrientation {
  return Number.isInteger(value) && value >= 1 && value <= 8;
}

export function readExifOrientation(buffer: ArrayBuffer): ExifOrientation {
  if (buffer.byteLength < 4) return DEFAULT_ORIENTATION;
  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xffd8) return DEFAULT_ORIENTATION;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xd9 || marker === 0xda) break;

    const segmentLength = view.getUint16(offset + 2, false);
    if (segmentLength < 2 || offset + 2 + segmentLength > view.byteLength) break;

    if (marker === 0xe1) {
      const exifOffset = offset + 4;
      const segmentEnd = offset + 2 + segmentLength;
      if (exifOffset + 14 <= segmentEnd && view.getUint32(exifOffset, false) === 0x45786966) {
        const tiffOffset = exifOffset + 6;
        const byteOrder = view.getUint16(tiffOffset, false);
        const littleEndian = byteOrder === 0x4949;
        if (littleEndian || byteOrder === 0x4d4d) {
          const read16 = (position: number) => view.getUint16(position, littleEndian);
          const read32 = (position: number) => view.getUint32(position, littleEndian);
          if (read16(tiffOffset + 2) === 0x002a) {
            const ifdOffset = tiffOffset + read32(tiffOffset + 4);
            if (ifdOffset + 2 <= segmentEnd) {
              const entryCount = read16(ifdOffset);
              for (let index = 0; index < entryCount; index += 1) {
                const entryOffset = ifdOffset + 2 + index * 12;
                if (entryOffset + 12 > segmentEnd) break;
                if (read16(entryOffset) !== 0x0112) continue;
                const type = read16(entryOffset + 2);
                const count = read32(entryOffset + 4);
                if (type !== 3 || count < 1) return DEFAULT_ORIENTATION;
                const value = read16(entryOffset + 8);
                return isExifOrientation(value) ? value : DEFAULT_ORIENTATION;
              }
            }
          }
        }
      }
    }

    offset += 2 + segmentLength;
  }

  return DEFAULT_ORIENTATION;
}
