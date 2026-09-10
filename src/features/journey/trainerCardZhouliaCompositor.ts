import {
  PHOTO_CLIP_POLYGON_MASTER,
  computeTrainerPhotoCrop,
  cropToTrainerPhotoPlacement,
  type TrainerPhotoCropInput,
  type TrainerPhotoFace,
  type TrainerPhotoOverride,
} from './trainerCardPhotoCrop';
import { ZHOULIA_CARD_FONT_FAMILY, ZHOULIA_CARD_FONT_WOFF2_DATA_URI } from './trainerCardZhouliaFont';
import { ZHOULIA_HEADER_RASTER_DATA_URI } from './trainerCardZhouliaHeaderRaster';

export const ZHOULIA_CARD_NATIVE_SIZE = Object.freeze({ width: 1448, height: 1086 });
export const ZHOULIA_CARD_BASE_HREF = '/assets/journey/zhoulia-trainer-card-surgical-v3-base.png';

export const ZHOULIA_BADGE_CENTERS = [
  [154.5, 881.5],
  [310.7857142857143, 881.5],
  [467.07142857142856, 881.5],
  [623.3571428571429, 881.5],
  [779.6428571428571, 881.5],
  [935.9285714285713, 881.5],
  [1092.2142857142858, 881.5],
  [1248.5, 881.5],
] as const;

const BADGE_SLOT = Object.freeze({ width: 109.35, height: 124.44 });
const PARTNER_SAFE_BOX = Object.freeze({ x: 1234.95, y: 494.92, width: 164.97, height: 259.25 });
const HEADER_RASTER_PATCH = Object.freeze({ x: 1238, y: 78, width: 170, height: 126 });
const CARD_FONT_STACK = `${ZHOULIA_CARD_FONT_FAMILY}, sans-serif`;
const MEASURED_FONT_WIDTH_SCALE = 0.86;

const FIELD_ROWS = [
  { key: 'name', label: 'Name', labelY: 288, valueY: 290, valueSize: 44 },
  { key: 'title', label: 'Title', labelY: 392, valueY: 393, valueSize: 38 },
  { key: 'feat', label: 'Feat', labelY: 496, valueY: 498, valueSize: 38 },
  { key: 'partner', label: 'Partner', labelY: 597, valueY: 601, valueSize: 45 },
  { key: 'idNo', label: 'ID No.', labelY: 700, valueY: 704, valueSize: 45 },
] as const;

type CanonicalFieldKey = (typeof FIELD_ROWS)[number]['key'];

export type ZhouliaTrainerCardFields = Record<CanonicalFieldKey, string>;

export type ZhouliaTrainerCardPhoto = {
  href: string;
  width: number;
  height: number;
  faces?: readonly TrainerPhotoFace[];
  subjectBox?: { x: number; y: number; w: number; h: number } | null;
  subjectCenter?: { x: number; y: number } | null;
  subjectConcentration?: number;
  override?: TrainerPhotoOverride;
};

export type ZhouliaTrainerCardCompositorInput = {
  baseHref?: string;
  fields: ZhouliaTrainerCardFields;
  photo: ZhouliaTrainerCardPhoto;
  partnerHref?: string | null;
  badgeHrefs?: readonly (string | null | undefined)[];
};

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function polygonPoints() {
  return PHOTO_CLIP_POLYGON_MASTER.map(([x, y]) => `${x},${y}`).join(' ');
}

function estimateTextWidth(value: string, fontSize: number) {
  let units = 0;
  for (const char of value) {
    if (' ilI1|.,:;!'.includes(char)) units += 0.28;
    else if ('mwMW@#%&'.includes(char)) units += 0.9;
    else if (char === ' ') units += 0.33;
    else units += 0.56;
  }
  return units * fontSize * MEASURED_FONT_WIDTH_SCALE;
}

function fittedFontSize(value: string, baseSize: number, minSize: number, maxWidth = 500) {
  const estimated = estimateTextWidth(value, baseSize);
  if (estimated <= maxWidth) return baseSize;
  return Math.max(minSize, Math.floor((baseSize * maxWidth) / estimated));
}

function buildFields(fields: ZhouliaTrainerCardFields) {
  return FIELD_ROWS.map((row) => {
    const value = fields[row.key];
    const valueSize = fittedFontSize(value, row.valueSize, row.key === 'feat' ? 22 : 28);
    return `<text data-bind="label-${row.key}" x="95" y="${row.labelY}" font-family="${CARD_FONT_STACK}" font-size="38" font-weight="700" fill="#315F8B">${row.label}</text><text data-bind="${row.key}" x="284" y="${row.valueY}" font-family="${CARD_FONT_STACK}" font-size="${valueSize}" font-weight="700" fill="#102A4C">${escapeXml(value)}</text>`;
  }).join('');
}

function buildPartner(partnerHref: string | null | undefined) {
  if (!partnerHref) return '';
  return `<image data-slot="partner-art" x="${PARTNER_SAFE_BOX.x}" y="${PARTNER_SAFE_BOX.y}" width="${PARTNER_SAFE_BOX.width}" height="${PARTNER_SAFE_BOX.height}" href="${escapeXml(partnerHref)}" preserveAspectRatio="xMidYMax meet"/>`;
}

function buildBadges(badgeHrefs: readonly (string | null | undefined)[]) {
  return ZHOULIA_BADGE_CENTERS.map(([centerX, centerY], index) => {
    const href = badgeHrefs[index];
    if (!href) return '';
    const x = centerX - BADGE_SLOT.width / 2;
    const y = centerY - BADGE_SLOT.height / 2;
    return `<image data-badge-center="${centerX},${centerY}" data-slot="badge-${index + 1}" x="${x}" y="${y}" width="${BADGE_SLOT.width}" height="${BADGE_SLOT.height}" href="${escapeXml(href)}" preserveAspectRatio="xMidYMid meet"/>`;
  }).join('');
}

function buildHeaderRasterPatch() {
  return `<image data-slot="fixed-header-raster" x="${HEADER_RASTER_PATCH.x}" y="${HEADER_RASTER_PATCH.y}" width="${HEADER_RASTER_PATCH.width}" height="${HEADER_RASTER_PATCH.height}" href="${ZHOULIA_HEADER_RASTER_DATA_URI}" preserveAspectRatio="none"/>`;
}

function buildFontDefinition() {
  return `<style>@font-face{font-family:'${ZHOULIA_CARD_FONT_FAMILY}';src:url('${ZHOULIA_CARD_FONT_WOFF2_DATA_URI}') format('woff2');font-weight:700;font-style:normal;font-display:block}</style>`;
}

export function buildZhouliaTrainerCardSvg(input: ZhouliaTrainerCardCompositorInput) {
  const cropInput: TrainerPhotoCropInput = {
    width: input.photo.width,
    height: input.photo.height,
    faces: input.photo.faces ? [...input.photo.faces] : [],
  };
  if (input.photo.subjectBox !== undefined) cropInput.subjectBox = input.photo.subjectBox;
  if (input.photo.subjectCenter !== undefined) cropInput.subjectCenter = input.photo.subjectCenter;
  if (input.photo.subjectConcentration !== undefined) cropInput.subjectConcentration = input.photo.subjectConcentration;
  if (input.photo.override !== undefined) cropInput.override = input.photo.override;

  const crop = computeTrainerPhotoCrop(cropInput);
  const placement = cropToTrainerPhotoPlacement(input.photo.width, input.photo.height, crop.crop);
  const baseHref = escapeXml(input.baseHref ?? ZHOULIA_CARD_BASE_HREF);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ZHOULIA_CARD_NATIVE_SIZE.width} ${ZHOULIA_CARD_NATIVE_SIZE.height}" width="${ZHOULIA_CARD_NATIVE_SIZE.width}" height="${ZHOULIA_CARD_NATIVE_SIZE.height}"><metadata>${escapeXml(JSON.stringify({ templateId: 'zhoulia-trainer-card-runtime-v1', photoMethod: crop.method, photoCrop: crop.crop }))}</metadata><defs>${buildFontDefinition()}<clipPath id="trainer-photo-clip"><polygon points="${polygonPoints()}"/></clipPath></defs><image data-slot="fixed-raster-art" x="0" y="0" width="1448" height="1086" href="${baseHref}" preserveAspectRatio="none"/>${buildHeaderRasterPatch()}<image data-slot="trainer-photo" x="${placement.x}" y="${placement.y}" width="${placement.width}" height="${placement.height}" href="${escapeXml(input.photo.href)}" clip-path="${placement.clipPath}" preserveAspectRatio="${placement.preserveAspectRatio}"/>${buildPartner(input.partnerHref)}${buildBadges(input.badgeHrefs ?? [])}<g data-slot="dynamic-fields">${buildFields(input.fields)}</g></svg>`;
}
