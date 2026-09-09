export const PHOTO_CLIP_POLYGON_MASTER = [
  [828.64, 218.71],
  [1223.64, 218.71],
  [1238.72, 233.79],
  [1238.72, 670.27],
  [1193.47, 715.52],
  [822.04, 715.52],
  [809.79, 703.26],
  [809.79, 232.85],
] as const;

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TrainerPhotoFace = Box & {
  score?: number;
};

export type TrainerPhotoOverride = {
  zoom?: number;
  panX?: number;
  panY?: number;
};

export type TrainerPhotoCropInput = {
  width: number;
  height: number;
  faces?: TrainerPhotoFace[];
  subjectBox?: Box | null;
  subjectCenter?: { x: number; y: number } | null;
  subjectConcentration?: number;
  override?: TrainerPhotoOverride;
};

export type TrainerPhotoCropMethod = 'face' | 'face-group' | 'subject' | 'center';

export type TrainerPhotoCropResult = {
  method: TrainerPhotoCropMethod;
  crop: Box;
  primaryFaces: number[];
  overrideApplied: Required<TrainerPhotoOverride>;
};

const polygonXs = PHOTO_CLIP_POLYGON_MASTER.map(([x]) => x);
const polygonYs = PHOTO_CLIP_POLYGON_MASTER.map(([, y]) => y);
const x0 = Math.min(...polygonXs);
const y0 = Math.min(...polygonYs);
const x1 = Math.max(...polygonXs);
const y1 = Math.max(...polygonYs);

export const PHOTO_SLOT_MASTER = Object.freeze({
  x0,
  y0,
  x1,
  y1,
  width: x1 - x0,
  height: y1 - y0,
  ratio: (x1 - x0) / (y1 - y0),
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const area = (box: Box) => Math.max(0, box.w) * Math.max(0, box.h);
const centerX = (box: Box) => box.x + box.w / 2;
const centerY = (box: Box) => box.y + box.h / 2;

function maxRatioCropSize(width: number, height: number) {
  if (width / height >= PHOTO_SLOT_MASTER.ratio) {
    return { w: height * PHOTO_SLOT_MASTER.ratio, h: height };
  }
  return { w: width, h: width / PHOTO_SLOT_MASTER.ratio };
}

function clampCrop(
  targetX: number,
  targetY: number,
  requestedWidth: number,
  requestedHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): Box {
  const max = maxRatioCropSize(sourceWidth, sourceHeight);
  let cropWidth = requestedWidth;
  let cropHeight = requestedHeight;

  if (cropWidth > max.w || cropHeight > max.h) {
    const scale = Math.min(max.w / cropWidth, max.h / cropHeight);
    cropWidth *= scale;
    cropHeight *= scale;
  }

  return {
    x: clamp(targetX - cropWidth / 2, 0, sourceWidth - cropWidth),
    y: clamp(targetY - cropHeight / 2, 0, sourceHeight - cropHeight),
    w: cropWidth,
    h: cropHeight,
  };
}

function centerCrop(width: number, height: number): Box {
  const { w, h } = maxRatioCropSize(width, height);
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

function choosePrimaryFace(faces: TrainerPhotoFace[], sourceWidth: number) {
  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  faces.forEach((face, index) => {
    const centerScore = 1 - Math.min(1, Math.abs(centerX(face) - sourceWidth / 2) / (sourceWidth / 2));
    const score = area(face) * (0.85 + 0.15 * centerScore) * (face.score ?? 1);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });

  return bestIndex;
}

function faceAwareCrop(width: number, height: number, faces: TrainerPhotoFace[]) {
  const primary = choosePrimaryFace(faces, width);
  const primaryBox = faces[primary];
  const meaningful = [primary];

  for (let index = 0; index < faces.length; index += 1) {
    if (index !== primary && area(faces[index]) >= area(primaryBox) * 0.42) meaningful.push(index);
  }

  if (meaningful.length > 1) {
    const selected = meaningful.map((index) => faces[index]);
    const unionX0 = Math.min(...selected.map((face) => face.x));
    const unionY0 = Math.min(...selected.map((face) => face.y));
    const unionX1 = Math.max(...selected.map((face) => face.x + face.w));
    const unionY1 = Math.max(...selected.map((face) => face.y + face.h));
    const union = { x: unionX0, y: unionY0, w: unionX1 - unionX0, h: unionY1 - unionY0 };

    let cropHeight = Math.max(union.h / 0.38, union.w / 0.76 / PHOTO_SLOT_MASTER.ratio);
    cropHeight = Math.max(cropHeight, PHOTO_SLOT_MASTER.height / 1.6);
    const cropWidth = cropHeight * PHOTO_SLOT_MASTER.ratio;
    const tentative = clampCrop(
      centerX(union),
      centerY(union) + (0.4 - 0.5) * cropHeight,
      cropWidth,
      cropHeight,
      width,
      height,
    );

    const safe = meaningful.every((index) => {
      const normalizedX = (centerX(faces[index]) - tentative.x) / tentative.w;
      const normalizedY = (centerY(faces[index]) - tentative.y) / tentative.h;
      return normalizedX >= 0.18 && normalizedX <= 0.82 && normalizedY >= 0.12 && normalizedY <= 0.62;
    });

    if (safe) return { crop: tentative, method: 'face-group' as const, primaryFaces: meaningful };
  }

  let cropHeight = primaryBox.h / 0.32;
  cropHeight = Math.max(cropHeight, PHOTO_SLOT_MASTER.height / 1.6);
  const cropWidth = cropHeight * PHOTO_SLOT_MASTER.ratio;
  const crop = clampCrop(
    centerX(primaryBox),
    centerY(primaryBox) + (0.5 - 0.35) * cropHeight,
    cropWidth,
    cropHeight,
    width,
    height,
  );

  return { crop, method: 'face' as const, primaryFaces: [primary] };
}

function subjectAwareCrop(
  width: number,
  height: number,
  subjectBox: Box | null | undefined,
  subjectCenter: { x: number; y: number } | null | undefined,
  concentration: number,
) {
  if (!subjectBox || !subjectCenter || concentration < 0.08) return null;

  const cropHeight = Math.max(subjectBox.h / 0.48, subjectBox.w / 0.68 / PHOTO_SLOT_MASTER.ratio, height * 0.55);
  const cropWidth = cropHeight * PHOTO_SLOT_MASTER.ratio;
  const targetX = subjectCenter.x * 0.55 + centerX(subjectBox) * 0.45;
  const targetY = subjectCenter.y * 0.55 + centerY(subjectBox) * 0.45;

  return clampCrop(targetX, targetY, cropWidth, cropHeight, width, height);
}

function normalizeOverride(override: TrainerPhotoOverride | undefined): Required<TrainerPhotoOverride> {
  return {
    zoom: clamp(Number(override?.zoom ?? 1), 0.8, 1.35),
    panX: clamp(Number(override?.panX ?? 0), -0.25, 0.25),
    panY: clamp(Number(override?.panY ?? 0), -0.25, 0.25),
  };
}

function applyOverride(crop: Box, width: number, height: number, override: Required<TrainerPhotoOverride>): Box {
  const cropHeight = crop.h / override.zoom;
  const cropWidth = cropHeight * PHOTO_SLOT_MASTER.ratio;
  return clampCrop(
    centerX(crop) + override.panX * crop.w,
    centerY(crop) + override.panY * crop.h,
    cropWidth,
    cropHeight,
    width,
    height,
  );
}

export function computeTrainerPhotoCrop(input: TrainerPhotoCropInput): TrainerPhotoCropResult {
  const { width, height } = input;
  if (!(width > 0 && height > 0)) throw new Error('Invalid trainer photo source dimensions');

  const faces = (input.faces ?? []).filter((face) => face.w > 0 && face.h > 0);
  let method: TrainerPhotoCropMethod;
  let crop: Box;
  let primaryFaces: number[] = [];

  if (faces.length > 0) {
    const faceResult = faceAwareCrop(width, height, faces);
    method = faceResult.method;
    crop = faceResult.crop;
    primaryFaces = faceResult.primaryFaces;
  } else {
    const subjectCrop = subjectAwareCrop(
      width,
      height,
      input.subjectBox,
      input.subjectCenter,
      input.subjectConcentration ?? 1,
    );
    if (subjectCrop) {
      method = 'subject';
      crop = subjectCrop;
    } else {
      method = 'center';
      crop = centerCrop(width, height);
    }
  }

  const overrideApplied = normalizeOverride(input.override);
  return {
    method,
    crop: applyOverride(crop, width, height, overrideApplied),
    primaryFaces,
    overrideApplied,
  };
}

export function cropToTrainerPhotoPlacement(sourceWidth: number, sourceHeight: number, crop: Box) {
  const scale = PHOTO_SLOT_MASTER.width / crop.w;
  return {
    x: PHOTO_SLOT_MASTER.x0 - crop.x * scale,
    y: PHOTO_SLOT_MASTER.y0 - crop.y * scale,
    width: sourceWidth * scale,
    height: sourceHeight * scale,
    scale,
    clipPath: 'url(#trainer-photo-clip)',
    preserveAspectRatio: 'none' as const,
  };
}
