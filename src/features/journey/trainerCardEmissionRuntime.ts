import { getPokemonSpeciesVisualAssets } from '../../visual-assets/pokemonVisualRegistry';
import type { JourneyProfilePreview } from './journeyProfilePreview';
import { readExifOrientation, type ExifOrientation } from './trainerCardExifOrientation';
import {
  buildZhouliaTrainerCardSvg,
  ZHOULIA_CARD_BASE_HREF,
  ZHOULIA_CARD_NATIVE_SIZE,
  type ZhouliaTrainerCardPhoto,
} from './trainerCardZhouliaCompositor';
import { mapProfileToZhouliaTrainerCardFields } from './trainerCardEmissionState';
import type { TrainerPhotoFace } from './trainerCardPhotoCrop';

type FaceDetection = {
  boundingBox: { x: number; y: number; width: number; height: number };
};

type FaceDetectorLike = {
  detect(input: HTMLImageElement): Promise<FaceDetection[]>;
};

type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorLike;

type NormalizedTrainerPhoto = {
  href: string;
  width: number;
  height: number;
  sourceOrientation: ExifOrientation;
};

export type EmittedTrainerCard = {
  pngBlob: Blob;
  pngUrl: string;
  svgString: string;
  downloadName: string;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('trainer-card-image-load-failed'));
    image.src = src;
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('trainer-card-data-url-failed'));
    reader.onerror = () => reject(reader.error ?? new Error('trainer-card-data-url-failed'));
    reader.readAsDataURL(blob);
  });
}

async function fetchAsBlob(src: string) {
  const response = src.startsWith('http://') || src.startsWith('https://')
    ? await fetch(src, { cache: 'force-cache', mode: 'cors' })
    : await fetch(src);
  if (!response.ok) throw new Error(`trainer-card-asset-http-${response.status}`);
  return response.blob();
}

async function fetchAsDataUrl(src: string) {
  if (src.startsWith('data:')) return src;
  return blobToDataUrl(await fetchAsBlob(src));
}

function canvasToPngDataUrl(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('trainer-card-photo-normalization-canvas-unavailable');
  context.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

async function normalizeTrainerPhotoSource(src: string): Promise<NormalizedTrainerPhoto> {
  const blob = await fetchAsBlob(src);
  const sourceOrientation = readExifOrientation(await blob.arrayBuffer());

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      const normalized = {
        href: canvasToPngDataUrl(bitmap, bitmap.width, bitmap.height),
        width: bitmap.width,
        height: bitmap.height,
        sourceOrientation,
      };
      bitmap.close();
      return normalized;
    } catch {
      // HTMLImageElement fallback below also honors from-image orientation in modern browsers.
    }
  }

  const image = await loadImage(await blobToDataUrl(blob));
  return {
    href: canvasToPngDataUrl(image, image.naturalWidth, image.naturalHeight),
    width: image.naturalWidth,
    height: image.naturalHeight,
    sourceOrientation,
  };
}

function getFaceDetectorConstructor(): FaceDetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  return (window as typeof window & { FaceDetector?: FaceDetectorConstructor }).FaceDetector ?? null;
}

async function detectFaces(image: HTMLImageElement): Promise<TrainerPhotoFace[]> {
  const FaceDetector = getFaceDetectorConstructor();
  if (!FaceDetector) return [];

  try {
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
    return (await detector.detect(image)).map(({ boundingBox }) => ({
      x: boundingBox.x,
      y: boundingBox.y,
      w: boundingBox.width,
      h: boundingBox.height,
      score: 1,
    }));
  } catch {
    return [];
  }
}

function analyzeSubjectSignal(image: HTMLImageElement) {
  const scanWidth = Math.min(256, image.naturalWidth);
  if (scanWidth <= 2 || image.naturalHeight <= 2) {
    return { subjectBox: null, subjectCenter: null, subjectConcentration: 0 };
  }

  const scale = scanWidth / image.naturalWidth;
  const scanHeight = Math.max(3, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = scanWidth;
  canvas.height = scanHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { subjectBox: null, subjectCenter: null, subjectConcentration: 0 };

  context.drawImage(image, 0, 0, scanWidth, scanHeight);
  const pixels = context.getImageData(0, 0, scanWidth, scanHeight).data;
  const luminance = new Float32Array(scanWidth * scanHeight);
  for (let y = 0; y < scanHeight; y += 1) {
    for (let x = 0; x < scanWidth; x += 1) {
      const pixelIndex = (y * scanWidth + x) * 4;
      const r = pixels[pixelIndex] ?? 0;
      const g = pixels[pixelIndex + 1] ?? 0;
      const b = pixels[pixelIndex + 2] ?? 0;
      luminance[y * scanWidth + x] = r * 0.299 + g * 0.587 + b * 0.114;
    }
  }

  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = scanWidth;
  let minY = scanHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 1; y < scanHeight - 1; y += 1) {
    for (let x = 1; x < scanWidth - 1; x += 1) {
      const index = y * scanWidth + x;
      const horizontal = Math.abs((luminance[index + 1] ?? 0) - (luminance[index - 1] ?? 0));
      const vertical = Math.abs((luminance[index + scanWidth] ?? 0) - (luminance[index - scanWidth] ?? 0));
      const weight = horizontal + vertical;
      if (weight <= 14) continue;
      totalWeight += weight;
      sumX += x * weight;
      sumY += y * weight;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (totalWeight <= 0 || maxX <= minX || maxY <= minY) {
    return { subjectBox: null, subjectCenter: null, subjectConcentration: 0 };
  }

  const sourceScaleX = image.naturalWidth / scanWidth;
  const sourceScaleY = image.naturalHeight / scanHeight;
  return {
    subjectBox: {
      x: minX * sourceScaleX,
      y: minY * sourceScaleY,
      w: (maxX - minX) * sourceScaleX,
      h: (maxY - minY) * sourceScaleY,
    },
    subjectCenter: {
      x: (sumX / totalWeight) * sourceScaleX,
      y: (sumY / totalWeight) * sourceScaleY,
    },
    subjectConcentration: Math.min(1, totalWeight / (scanWidth * scanHeight * 42)),
  };
}

async function prepareTrainerPhoto(src: string): Promise<ZhouliaTrainerCardPhoto> {
  const normalized = await normalizeTrainerPhotoSource(src);
  const image = await loadImage(normalized.href);
  const faces = await detectFaces(image);
  const subject = faces.length === 0 ? analyzeSubjectSignal(image) : null;

  return {
    href: normalized.href,
    width: normalized.width,
    height: normalized.height,
    faces,
    subjectBox: subject?.subjectBox ?? null,
    subjectCenter: subject?.subjectCenter ?? null,
    subjectConcentration: subject?.subjectConcentration ?? 0,
  };
}

async function trimTransparentArtwork(src: string) {
  const href = await fetchAsDataUrl(src);
  const image = await loadImage(href);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return href;
  context.drawImage(image, 0, 0);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = pixels[(y * canvas.width + x) * 4 + 3] ?? 0;
      if (alpha <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return href;

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const outputContext = output.getContext('2d');
  if (!outputContext) return href;
  outputContext.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
  return output.toDataURL('image/png');
}

export function getPartnerArtworkCandidates(dex: number) {
  const visual = getPokemonSpeciesVisualAssets(dex);
  return [visual.artworkOfficial, visual.artworkHome];
}

export function getZhouliaBadgeArtworkCandidates(_slotIndex: number, _assetUrl: string | null | undefined) {
  return [] as string[];
}

async function resolvePartnerArtwork(dex: number) {
  for (const candidate of getPartnerArtworkCandidates(dex)) {
    try {
      return await trimTransparentArtwork(candidate);
    } catch {
      // Fall through to the next canonical artwork source.
    }
  }
  return null;
}

async function resolveBadgeHrefs(profile: JourneyProfilePreview) {
  return Promise.all(profile.badges.slice(0, 8).map(async (badge) => {
    if (!badge.earned || !badge.assetUrl) return null;
    try {
      return await fetchAsDataUrl(badge.assetUrl);
    } catch {
      return null;
    }
  }));
}

async function rasterizeSvg(svgString: string) {
  if (document.fonts?.ready) await document.fonts.ready;
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = ZHOULIA_CARD_NATIVE_SIZE.width;
    canvas.height = ZHOULIA_CARD_NATIVE_SIZE.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('trainer-card-canvas-unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('trainer-card-png-encode-failed')), 'image/png');
    });
    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function buildTrainerCardDownloadName(trainerId: string) {
  const safeId = trainerId.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `trainer-card-${safeId || 'zhoulia'}.png`;
}

export async function emitZhouliaTrainerCard({
  profile,
  avatarUrl,
}: {
  profile: JourneyProfilePreview;
  avatarUrl: string;
}): Promise<EmittedTrainerCard> {
  if (!profile.leadPokemon) throw new Error('trainer-card-partner-missing');

  const [baseHref, photo, partnerHref, badgeHrefs] = await Promise.all([
    fetchAsDataUrl(ZHOULIA_CARD_BASE_HREF),
    prepareTrainerPhoto(avatarUrl),
    resolvePartnerArtwork(profile.leadPokemon.dex),
    resolveBadgeHrefs(profile),
  ]);

  const svgString = buildZhouliaTrainerCardSvg({
    baseHref,
    fields: mapProfileToZhouliaTrainerCardFields(profile),
    photo,
    partnerHref,
    badgeHrefs,
  });
  const pngBlob = await rasterizeSvg(svgString);
  return {
    pngBlob,
    pngUrl: URL.createObjectURL(pngBlob),
    svgString,
    downloadName: buildTrainerCardDownloadName(profile.trainerId),
  };
}
