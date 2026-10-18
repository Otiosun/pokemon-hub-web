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

/** Read standard, uncompressed ZIP archives. No remote files, no extra packages,
 * and no decompression bombs: both provided archives use ZIP_STORED.
 */
export async function extractFmZip(file: Blob): Promise<File[]> {
  if (file.size > MAX_ARCHIVE_BYTES || file.size < 100) throw new Error('O pacote de áudio tem tamanho inválido.');
  const buffer = await file.arrayBuffer();
  const dv = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const files: File[] = [];
  let offset = 0;
  while (offset + 30 <= buffer.byteLength && dv.getUint32(offset, true) === 0x04034b50) {
    const flags = dv.getUint16(offset + 6, true);
    const method = dv.getUint16(offset + 8, true);
    const size = dv.getUint32(offset + 18, true);
    const uncompressed = dv.getUint32(offset + 22, true);
    const nameSize = dv.getUint16(offset + 26, true);
    const extraSize = dv.getUint16(offset + 28, true);
    const start = offset + 30 + nameSize + extraSize;
    if ((flags & 0x08) !== 0 || method !== 0 || size !== uncompressed ||
        size > MAX_TRACK_BYTES || start > bytes.length || start + size > bytes.length) {
      throw new Error('Pacote incompatível. Use o ZIP do Beyond FM ou selecione as quatro faixas MP3.');
    }
    const filename = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameSize));
    if (!recognizeFmFile(filename) || files.length >= 4) throw new Error('O ZIP contém uma faixa não reconhecida.');
    files.push(new File([buffer.slice(start, start + size)], filename, { type: filename.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4' }));
    offset = start + size;
  }
  if (files.length !== 4 || dv.getUint32(offset, true) !== 0x02014b50) {
    throw new Error('O pacote está incompleto ou não é um ZIP compatível.');
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
