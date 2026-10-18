import { describe, expect, it } from 'vitest';
import { BEYOND_FM_TRACKS, extractFmZip, importFmFiles, recognizeFmFile, validateFmReplacementFile } from './beyondFmLibrary';

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

const names = [
  '01_Qumu_Cynthia.mp3',
  '02_Michael_Tai_National_Park.mp3',
  '03_The_Zame_Driftveil_City.mp3',
  '04_Satoshi_Alola_Instrumental.mp3',
];

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function encode16(dest: DataView, at: number, value: number) { dest.setUint16(at, value, true); }
function encode32(dest: DataView, at: number, value: number) { dest.setUint32(at, value, true); }
type ZipSong = { filename: string; data: Uint8Array };
async function makeZip(
  songs: ZipSong[],
  options: { compressed?: boolean; descriptor?: boolean; metadata?: boolean; corrupt?: boolean } = {},
): Promise<File> {
  const encoder = new TextEncoder();
  const inputs: ZipSong[] = options.metadata
    ? [{ filename: 'music/', data: new Uint8Array() },
       { filename: '__MACOSX/._track', data: new Uint8Array([1, 2]) },
       ...songs] : songs;
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const song of inputs) {
    const filename = encoder.encode(song.filename);
    const compressed = options.compressed && song.data.length
      ? new Uint8Array(await new Response(
        new Blob([ownedBuffer(song.data)]).stream().pipeThrough(new CompressionStream('deflate-raw')),
      ).arrayBuffer())
      : song.data;
    const method = options.compressed && song.data.length ? 8 : 0;
    const checksum = crc32(song.data);
    const head = new Uint8Array(30 + filename.byteLength);
    const h = new DataView(head.buffer);
    encode32(h, 0, 0x04034b50);
    encode16(h, 4, 20);
    encode16(h, 6, options.descriptor ? 8 : 0);
    encode16(h, 8, method);
    if (!options.descriptor) {
      encode32(h, 14, checksum);
      encode32(h, 18, compressed.byteLength);
      encode32(h, 22, song.data.byteLength);
    }
    encode16(h, 26, filename.byteLength);
    head.set(filename, 30);
    const descriptor = new Uint8Array(options.descriptor ? 16 : 0);
    if (options.descriptor) {
      const d = new DataView(descriptor.buffer);
      encode32(d, 0, 0x08074b50);
      encode32(d, 4, checksum);
      encode32(d, 8, compressed.byteLength);
      encode32(d, 12, song.data.byteLength);
    }
    const index = new Uint8Array(46 + filename.byteLength);
    const v = new DataView(index.buffer);
    encode32(v, 0, 0x02014b50);
    encode16(v, 4, 20);
    encode16(v, 6, 20);
    encode16(v, 8, options.descriptor ? 8 : 0);
    encode16(v, 10, method);
    encode32(v, 16, options.corrupt && song === songs[0] ? (checksum ^ 42) >>> 0 : checksum);
    encode32(v, 20, compressed.byteLength);
    encode32(v, 24, song.data.byteLength);
    encode16(v, 28, filename.byteLength);
    encode32(v, 42, offset);
    index.set(filename, 46);
    locals.push(head, compressed, descriptor);
    central.push(index);
    offset += head.byteLength + compressed.byteLength + descriptor.byteLength;
  }
  const centralSize = central.reduce((n, b) => n + b.byteLength, 0);
  const comment = new TextEncoder().encode('Beyond FM test');
  const end = new Uint8Array(22 + comment.length);
  const v = new DataView(end.buffer);
  encode32(v, 0, 0x06054b50);
  encode16(v, 8, inputs.length);
  encode16(v, 10, inputs.length);
  encode32(v, 12, centralSize);
  encode32(v, 16, offset);
  encode16(v, 20, comment.byteLength);
  end.set(comment, 22);
  return new File([...locals, ...central, end].map(ownedBuffer), 'Beyond_FM.zip', { type: 'application/zip' });
}

function fourSongs(): ZipSong[] {
  return names.map((filename, index) => ({
    filename,
    data: new Uint8Array(15000).fill(index + 10),
  }));
}

describe('Beyond FM music import', () => {
  it('recognizes original M4A and re-encoded MP3 naming', () => {
    expect(names.map(recognizeFmFile)).toEqual(BEYOND_FM_TRACKS.map((t) => t.id));
    expect(recognizeFmFile('Qumu - Cynthia.m4a')).toBe('cynthia');
    expect(recognizeFmFile('Satoshi - アローラ!! -Instrumental-.mp3')).toBe('alola');
    expect(recognizeFmFile('wrong.mp3')).toBeNull();
  });
  it('allows replacing just Alola with a user-chosen MP3 while rejecting other formats', () => {
    const file = new File([new Uint8Array(15000)], 'nova-musica-alola.MP3', { type: '' });
    const one = validateFmReplacementFile('alola', file);
    expect(one.id).toBe('alola');
    expect(one.blob.type).toBe('audio/mpeg');
    expect(one.blob.size).toBe(15000);
    expect(() => validateFmReplacementFile('alola',
      new File([new Uint8Array(15000)], 'alola.m4a'))).toThrow('MP3');
    expect(() => validateFmReplacementFile('alola',
      new File([new Uint8Array(12)], 'alola.mp3'))).toThrow('MP3');
  });

  it('accepts four separate MP3 or M4A files', async () => {
    const files = names.map((name) => new File([new Uint8Array(15000)], name, { type: 'audio/mpeg' }));
    expect((await importFmFiles(files)).map((t) => t.id))
      .toEqual(BEYOND_FM_TRACKS.map((t) => t.id));
    const m4a = files.map((f) => new File([f], f.name.replace('.mp3', '.m4a'), { type: 'audio/mp4' }));
    expect((await importFmFiles(m4a)).every((t) => t.blob.type === 'audio/mp4')).toBe(true);
  });
  it('reads a standard uncompressed ZIP with correct central directory', async () => {
    const entries = await importFmFiles([await makeZip(fourSongs())]);
    expect(entries.map((t) => t.id)).toEqual(BEYOND_FM_TRACKS.map((t) => t.id));
    expect(entries.every((t) => t.blob.size === 15000 && t.blob.type === 'audio/mpeg')).toBe(true);
  });
  it('supports Windows/Android DEFLATE ZIP, data descriptors and ignored OS metadata', async () => {
    const archive = await makeZip(fourSongs(), { compressed: true, descriptor: true, metadata: true });
    const tracks = await importFmFiles([archive]);
    expect(tracks.map((t) => t.id)).toEqual(BEYOND_FM_TRACKS.map((t) => t.id));
    expect(tracks.every((t) => t.blob.size === 15000)).toBe(true);
    const raw = new Uint8Array(await tracks[2]!.blob.arrayBuffer());
    expect(raw[0]).toBe(12);
    expect(raw[raw.length - 1]).toBe(12);
  });
  it('rejects corrupted checksums and duplicate song IDs', async () => {
    await expect(importFmFiles([await makeZip(fourSongs(), { corrupt: true })]))
      .rejects.toThrow('integridade');
    await expect(importFmFiles([await makeZip([...fourSongs().slice(0, 3), fourSongs()[0]!])]))
      .rejects.toThrow('duplicadas');
  });
  it('rejects truncated ZIP and missing songs rather than pretending to import', async () => {
    const zip = await makeZip(fourSongs());
    const truncated = new File([await zip.slice(0, -3).arrayBuffer()], 'broken.zip');
    await expect(extractFmZip(truncated)).rejects.toThrow();
    await expect(importFmFiles([await makeZip(fourSongs().slice(0, 3))]))
      .rejects.toThrow('quatro músicas');
    await expect(importFmFiles(fourSongs().slice(0, 3).map((s) =>
      new File([ownedBuffer(s.data)], s.filename)))).rejects.toThrow('quatro faixas');
  });
});
