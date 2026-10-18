import { describe, expect, it } from 'vitest';
import { BEYOND_FM_TRACKS, importFmFiles, recognizeFmFile } from './beyondFmLibrary';
const names = [
  '01_Qumu_Cynthia.m4a',
  '02_Michael_Tai_National_Park.m4a',
  '03_The_Zame_Driftveil_City.m4a',
  '04_Satoshi_Alola_Instrumental.m4a',
];
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
  it('rejects missing or duplicate songs', async () => {
    const make = (name: string) => new File([new Uint8Array(15_000)], name);
    await expect(importFmFiles(names.slice(0, 3).map(make))).rejects.toThrow();
    await expect(importFmFiles([...names.slice(0, 3), names[0]!].map(make))).rejects.toThrow();
  });
});
