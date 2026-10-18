export type BeyondFmTrackId = 'cynthia' | 'national-park' | 'driftveil' | 'alola';
export interface BeyondFmTrack {
  id: BeyondFmTrackId;
  title: string;
  artist: string;
  duration: number;
  sourcePage: string;
}
export interface LocalFmTrack { id: BeyondFmTrackId; blob: Blob }
export const BEYOND_FM_TRACKS: readonly BeyondFmTrack[] = [
  { id: 'cynthia', title: 'Cynthia · Champion Battle', artist: 'Qumu', duration: 139.46, sourcePage: 'https://qumu.lnk.to/Cynthia' },
  { id: 'national-park', title: 'National Park', artist: 'Michael Tai', duration: 185.2, sourcePage: 'https://music.apple.com/us/song/1272981837' },
  { id: 'driftveil', title: 'Driftveil City', artist: 'The Zame', duration: 163.43, sourcePage: 'https://www.youtube.com/@Zame' },
  { id: 'alola', title: 'Alola!! · Instrumental', artist: 'Satoshi & Pikachu', duration: 260.57, sourcePage: 'https://www.sonymusic.co.jp/artist/sakotomohisa/info/477648' },
];
const trackIds = BEYOND_FM_TRACKS.map((t) => t.id);
const LIBRARY_DATABASE = 'pokemon-beyond-fm-library';
const MAX_ARCHIVE_BYTES = 26_000_000;
const MAX_TRACK_BYTES = 13_000_000;

export function recognizeFmFile(name: string): BeyondFmTrackId | null {
  const lower = name.toLowerCase();
  if (!lower.endsWith('.m4a') && !lower.endsWith('.mp3')) return null;
  if (lower.includes('cynthia')) return 'cynthia';
  if (lower.includes('national') && lower.includes('park')) return 'national-park';
  if (lower.includes('driftveil')) return 'driftveil';
  if (lower.includes('alola') || lower.includes('アローラ')) return 'alola';
  return null;
}

/** A bounded ZIP central-directory reader. Accepts standard ZIP_STORED and
 * DEFLATE files, including Android/Windows archives with data descriptors.
 * Only our four recognized songs are extracted. All other metadata is skipped.
 */
const ZIP_LOCAL = 0x04034b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_END = 0x06054b50;

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let bit = 0; bit < 8; bit++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  CRC_TABLE[i] = c >>> 0;
}
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]!;
  return (crc ^ 0xffffffff) >>> 0;
}

async function inflateZipEntry(
  packed: Uint8Array,
  expectedSize: number,
): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('O navegador não abre ZIP compactado. Extraia o pacote e escolha os quatro MP3.');
  }
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = new Blob([new Uint8Array(packed).buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  } catch {
    throw new Error('Este navegador não suporta a compressão do ZIP. Extraia os quatro MP3 e importe-os juntos.');
  }
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_TRACK_BYTES || total > expectedSize) {
        await reader.cancel();
        throw new Error('O ZIP declara um tamanho incorreto ou excessivo para a música.');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('tamanho')) throw error;
    throw new Error('Não foi possível descompactar uma das músicas. Extraia o ZIP e importe os quatro MP3.');
  } finally {
    reader.releaseLock();
  }
  if (total !== expectedSize) throw new Error('Um arquivo do ZIP está incompleto.');
  const result = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) { result.set(chunk, cursor); cursor += chunk.byteLength; }
  return result;
}

export async function extractFmZip(file: Blob): Promise<File[]> {
  if (file.size > MAX_ARCHIVE_BYTES || file.size < 100) {
    throw new Error('O pacote de músicas tem tamanho inválido.');
  }
  const buffer = await file.arrayBuffer();
  const dv = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();

  // The EOCD can be followed by a ZIP file comment up to 65535 bytes long.
  let end = -1;
  for (let at = buffer.byteLength - 22; at >= Math.max(0, buffer.byteLength - 65_557); at--) {
    if (dv.getUint32(at, true) === ZIP_END &&
        at + 22 + dv.getUint16(at + 20, true) === buffer.byteLength) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new Error('O ZIP está incompleto. Importe o pacote original ou as quatro faixas MP3.');
  const entryCount = dv.getUint16(end + 10, true);
  const centralSize = dv.getUint32(end + 12, true);
  const centralOffset = dv.getUint32(end + 16, true);
  if (dv.getUint16(end + 4, true) !== 0 || dv.getUint16(end + 6, true) !== 0 ||
      entryCount !== dv.getUint16(end + 8, true) || entryCount > 64 ||
      entryCount === 0 || centralSize === 0 || centralOffset + centralSize > end) {
    throw new Error('O formato deste ZIP não é compatível. Extraia os quatro MP3 e selecione-os juntos.');
  }

  const files: File[] = [];
  const seen = new Set<BeyondFmTrackId>();
  let unpackedTotal = 0;
  let at = centralOffset;
  for (let i = 0; i < entryCount; i++) {
    if (at + 46 > end || dv.getUint32(at, true) !== ZIP_CENTRAL) {
      throw new Error('A lista de arquivos do ZIP está corrompida.');
    }
    const flags = dv.getUint16(at + 8, true);
    const method = dv.getUint16(at + 10, true);
    const checksum = dv.getUint32(at + 16, true);
    const packedSize = dv.getUint32(at + 20, true);
    const plainSize = dv.getUint32(at + 24, true);
    const nameSize = dv.getUint16(at + 28, true);
    const extraSize = dv.getUint16(at + 30, true);
    const commentSize = dv.getUint16(at + 32, true);
    const localOffset = dv.getUint32(at + 42, true);
    const next = at + 46 + nameSize + extraSize + commentSize;
    if (next > end || localOffset === 0xffffffff ||
        packedSize === 0xffffffff || plainSize === 0xffffffff) {
      throw new Error('O ZIP utiliza um formato não suportado. Extraia as músicas e importe os MP3.');
    }
    const filename = decoder.decode(bytes.subarray(at + 46, at + 46 + nameSize));
    at = next;
    const trackId = recognizeFmFile(filename);
    // Ignore OS metadata, folder entries and non-music files without unpacking.
    if (!trackId || filename.includes('__MACOSX/') || filename.endsWith('/')) continue;
    if (seen.has(trackId)) throw new Error('O ZIP contém músicas duplicadas.');
    if ((flags & 1) !== 0 || (method !== 0 && method !== 8) ||
        plainSize < 10_000 || plainSize > MAX_TRACK_BYTES ||
        packedSize > MAX_ARCHIVE_BYTES || unpackedTotal + plainSize > MAX_ARCHIVE_BYTES ||
        localOffset + 30 > buffer.byteLength || dv.getUint32(localOffset, true) !== ZIP_LOCAL) {
      throw new Error('Uma das músicas do ZIP não pode ser importada com segurança.');
    }
    const dataStart = localOffset + 30
      + dv.getUint16(localOffset + 26, true)
      + dv.getUint16(localOffset + 28, true);
    if (dataStart > centralOffset || packedSize > centralOffset - dataStart) {
      throw new Error('Uma das músicas do ZIP está incompleta.');
    }
    const packed = bytes.subarray(dataStart, dataStart + packedSize);
    const decoded = method === 0 ? packed : await inflateZipEntry(packed, plainSize);
    if (decoded.byteLength !== plainSize || crc32(decoded) !== checksum) {
      throw new Error('Uma das músicas do ZIP falhou na verificação de integridade.');
    }
    files.push(new File([new Uint8Array(decoded)], filename, {
      type: filename.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4',
    }));
    unpackedTotal += plainSize;
    seen.add(trackId);
  }
  if (files.length !== 4) {
    throw new Error('O ZIP precisa conter as quatro músicas do Beyond FM.');
  }
  return files;
}

export async function importFmFiles(selected: readonly File[]): Promise<LocalFmTrack[]> {
  const files = selected.length === 1 && selected[0]?.name.toLowerCase().endsWith('.zip')
    ? await extractFmZip(selected[0]) : [...selected];
  if (files.length !== 4) throw new Error('Selecione as quatro faixas MP3 ou o pacote ZIP completo.');
  const mapped = new Map<BeyondFmTrackId, Blob>();
  for (const file of files) {
    const id = recognizeFmFile(file.name);
    if (!id || mapped.has(id) || file.size < 10_000 || file.size > MAX_TRACK_BYTES) {
      throw new Error('Uma faixa está faltando, duplicada ou não é reconhecida.');
    }
    mapped.set(id, file);
  }
  if (!trackIds.every((id) => mapped.has(id))) throw new Error('As quatro faixas precisam estar presentes.');
  return trackIds.map((id) => ({ id, blob: mapped.get(id)! }));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Armazenamento local indisponível.')); return; }
    const request = indexedDB.open(LIBRARY_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('audio')) request.result.createObjectStore('audio', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir a biblioteca.'));
  });
}

export async function saveFmLibrary(tracks: readonly LocalFmTrack[]): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('audio', 'readwrite');
      const store = transaction.objectStore('audio');
      store.clear();
      for (const track of tracks) store.put({ id: track.id, blob: track.blob });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Armazenamento interrompido.'));
    });
  } finally { db.close(); }
}

export async function restoreFmLibrary(): Promise<LocalFmTrack[]> {
  const db = await openDatabase();
  try {
    const result = await new Promise<unknown[]>((resolve, reject) => {
      const tx = db.transaction('audio', 'readonly');
      const req = tx.objectStore('audio').getAll();
      req.onsuccess = () => resolve(req.result as unknown[]);
      req.onerror = () => reject(req.error);
    });
    const mapped = new Map<BeyondFmTrackId, Blob>();
    for (const item of result) {
      const object = item as { id?: BeyondFmTrackId; blob?: Blob };
      if (trackIds.includes(object.id!) && object.blob instanceof Blob &&
          object.blob.size >= 10_000 && object.blob.size <= MAX_TRACK_BYTES) mapped.set(object.id!, object.blob);
    }
    return trackIds.every((id) => mapped.has(id))
      ? trackIds.map((id) => ({ id, blob: mapped.get(id)! })) : [];
  } finally { db.close(); }
}
