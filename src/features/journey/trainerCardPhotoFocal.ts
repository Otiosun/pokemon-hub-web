export type TrainerPhotoFocalPoint = {
  x: number;
  y: number;
  source: 'orientation-fallback' | 'face-detector';
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

export async function resolveTrainerPhotoFocalPoint(src: string): Promise<TrainerPhotoFocalPoint> {
  const image = await loadImage(src);
  const fallback = getTrainerPhotoFallback(image.naturalWidth, image.naturalHeight);
  const FaceDetector = getFaceDetectorConstructor();
  if (!FaceDetector) return fallback;

  try {
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 4 });
    const primary = pickPrimaryFace(await detector.detect(image), image.naturalWidth);
    if (!primary) return fallback;

    const box = primary.boundingBox;
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;

    return {
      x: clamp(faceCenterX / image.naturalWidth, 0.28, 0.72),
      y: clamp((faceCenterY + box.height * 0.65) / image.naturalHeight, 0.34, 0.68),
      source: 'face-detector',
    };
  } catch {
    return fallback;
  }
}
