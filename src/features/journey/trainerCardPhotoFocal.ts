export type TrainerPhotoFocalPoint = {
  x: number;
  y: number;
  source: 'orientation-fallback' | 'face-detector';
};

export type TrainerPhotoPlacement = TrainerPhotoFocalPoint & {
  zoom: number;
};

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

const ZHOULIA_PHOTO_SLOT_RATIO = 0.86337;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getTrainerPhotoFallback(width: number, height: number): TrainerPhotoFocalPoint {
  if (width <= 0 || height <= 0) return { x: 0.5, y: 0.5, source: 'orientation-fallback' };

  const ratio = width / height;
  if (ratio < 0.72) return { x: 0.5, y: 0.46, source: 'orientation-fallback' };
  if (ratio > 1.45) return { x: 0.5, y: 0.48, source: 'orientation-fallback' };
  return { x: 0.5, y: 0.5, source: 'orientation-fallback' };
}

export function getTrainerPhotoPlacementFallback(width: number, height: number): TrainerPhotoPlacement {
  const focal = getTrainerPhotoFallback(width, height);
  if (width <= 0 || height <= 0) return { ...focal, zoom: 1 };

  const ratio = width / height;
  if (ratio < 0.62) return { ...focal, y: 0.43, zoom: 1.08 };
  if (ratio > 1.75) return { ...focal, y: 0.47, zoom: 1.04 };
  return { ...focal, zoom: 1 };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('trainer-photo-load-failed'));
    image.src = src;
  });
}

function getFaceDetectorConstructor(): FaceDetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  return (window as typeof window & { FaceDetector?: FaceDetectorConstructor }).FaceDetector ?? null;
}

function pickPrimaryFace(faces: FaceDetection[], imageWidth: number) {
  const imageCenterX = imageWidth / 2;
  return faces
    .map((face) => {
      const box = face.boundingBox;
      const area = box.width * box.height;
      const faceCenterX = box.x + box.width / 2;
      const centerPenalty = Math.abs(faceCenterX - imageCenterX) * Math.max(box.width, 1);
      return { face, score: area - centerPenalty * 0.25 };
    })
    .sort((a, b) => b.score - a.score)[0]?.face ?? null;
}

function getFaceAwareZoom(
  imageWidth: number,
  imageHeight: number,
  faceHeight: number,
  targetRatio = ZHOULIA_PHOTO_SLOT_RATIO,
) {
  if (imageWidth <= 0 || imageHeight <= 0 || faceHeight <= 0) return 1;

  const imageRatio = imageWidth / imageHeight;
  const visibleHeightFraction = imageRatio >= targetRatio ? 1 : imageRatio / targetRatio;
  const faceHeightFraction = faceHeight / imageHeight;
  const desiredFaceShare = 0.32;
  return clamp((desiredFaceShare * visibleHeightFraction) / faceHeightFraction, 1, 1.55);
}

export function getTrainerPhotoFacePlacement(
  imageWidth: number,
  imageHeight: number,
  box: FaceDetection['boundingBox'],
): TrainerPhotoPlacement {
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;

  return {
    x: clamp(faceCenterX / imageWidth, 0.24, 0.76),
    y: clamp((faceCenterY + box.height * 0.72) / imageHeight, 0.34, 0.66),
    zoom: getFaceAwareZoom(imageWidth, imageHeight, box.height),
    source: 'face-detector',
  };
}

export async function resolveTrainerPhotoFocalPoint(src: string): Promise<TrainerPhotoFocalPoint> {
  const placement = await resolveTrainerPhotoPlacement(src);
  return { x: placement.x, y: placement.y, source: placement.source };
}

export async function resolveTrainerPhotoPlacement(src: string): Promise<TrainerPhotoPlacement> {
  const image = await loadImage(src);
  const fallback = getTrainerPhotoPlacementFallback(image.naturalWidth, image.naturalHeight);
  const FaceDetector = getFaceDetectorConstructor();
  if (!FaceDetector) return fallback;

  try {
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 4 });
    const primary = pickPrimaryFace(await detector.detect(image), image.naturalWidth);
    if (!primary) return fallback;
    return getTrainerPhotoFacePlacement(image.naturalWidth, image.naturalHeight, primary.boundingBox);
  } catch {
    return fallback;
  }
}
