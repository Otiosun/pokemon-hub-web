import { describe, expect, it } from 'vitest';
import { BEYOND_FM_TRACKS, importFmFiles, recognizeFmFile } from './beyondFmLibrary';
const names = [
  '01_Qumu_Cynthia.m4a',
  '02_Michael_Tai_National_Park.m4a',
  '03_The_Zame_Driftveil_City.m4a',
  '04_Satoshi_Alola_Instrumental.m4a',
];
const mp3Names = names.map((name) => name.replace(/\.m4a$/, '.mp3'));
describe('Beyond FM local music import', () => {
  it('recognizes all four and original Japanese title', () => {
    expect(names.map(recognizeFmFile)).toEqual(BEYOND_FM_TRACKS.map((track) => track.id));
    expect(recognizeFmFile('Satoshi - アローラ!! -Instrumental-.m4a')).toBe('alola');
    expect(recognizeFmFile('fake.mp3')).toBeNull();
  });
  it('accepts exactly four M4A audio files', async () => {
    const files = names.map((name) => new File([new Uint8Array(15_000)], name, { type: 'audio/mp4' }));
    const tracks = await importFmFiles(files);
    expect(tracks.map((track) => track.id)).toEqual(BEYOND_FM_TRACKS.map((track) => track.id));
    expect(tracks.every((track) => track.blob.size === 15_000)).toBe(true);
  });
  it('imports the four songs from the supplied kind of uncompressed ZIP', async () => {
    const encoder = new TextEncoder();
    const parts: BlobPart[] = [];
    for (const name of names) {
      const filename = encoder.encode(name);
      const payload = new Uint8Array(15_000);
      const header = new Uint8Array(30);
      const dv = new DataView(header.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(8, 0, true); // ZIP_STORED
      dv.setUint32(18, payload.length, true);
      dv.setUint32(22, payload.length, true);
      dv.setUint16(26, filename.length, true);
      parts.push(header, filename, payload);
    }
    // Central directory signature marks the end of local entries.
    parts.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02]));
    const archive = new File(parts, 'Beyond_FM_4_Faixas.zip', { type: 'application/zip' });
    const tracks = await importFmFiles([archive]);
    expect(tracks.map((track) => track.id)).toEqual(BEYOND_FM_TRACKS.map((track) => track.id));
    expect(tracks.every((track) => track.blob.size === 15_000)).toBe(true);
  });
  it('recognizes and imports all four MP3 files as audio/mpeg', async () => {
    expect(mp3Names.map(recognizeFmFile)).toEqual(BEYOND_FM_TRACKS.map((track) => track.id));
    const files = mp3Names.map((name) => new File([new Uint8Array(15_000)], name, { type: 'audio/mpeg' }));
    const result = await importFmFiles(files);
    expect(result).toHaveLength(4);
    expect(result.every((track) => track.blob.type === 'audio/mpeg')).toBe(true);
  });
  it('decodes the supported ZIP_STORED MP3 package and preserves the audio MIME type', async () => {
    const encoder = new TextEncoder();
    const parts: BlobPart[] = [];
    for (const name of mp3Names) {
      const filename = encoder.encode(name);
      const payload = new Uint8Array(15_000);
      const header = new Uint8Array(30);
      const dv = new DataView(header.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(8, 0, true);
      dv.setUint32(18, payload.length, true);
      dv.setUint32(22, payload.length, true);
      dv.setUint16(26, filename.length, true);
      parts.push(header, filename, payload);
    }
    parts.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02]));
    const archive = new File(parts, 'Beyond_FM_4_Faixas_MP3_Compativel.zip');
    const result = await importFmFiles([archive]);
    expect(result.map((track) => track.id)).toEqual(BEYOND_FM_TRACKS.map((track) => track.id));
    expect(result.every((track) => track.blob.type === 'audio/mpeg')).toBe(true);
  });
  it('rejects missing or duplicate songs', async () => {
    const make = (name: string) => new File([new Uint8Array(15_000)], name);
    await expect(importFmFiles(names.slice(0, 3).map(make))).rejects.toThrow();
    await expect(importFmFiles([...names.slice(0, 3), names[0]!].map(make))).rejects.toThrow();
  });
});
