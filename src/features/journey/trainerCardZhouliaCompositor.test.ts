import { describe, expect, it } from 'vitest';
import { buildZhouliaTrainerCardSvg, ZHOULIA_BADGE_CENTERS } from './trainerCardZhouliaCompositor';

describe('Zhoulia Trainer Card SVG compositor', () => {
  const input = {
    baseHref: '/assets/journey/zhoulia-trainer-card-surgical-v3-base.png',
    fields: {
      name: 'Enzo & Cia',
      title: 'Explorador de Fronteiras',
      feat: 'Campeão — Copa da Primavera',
      partner: 'Brasa',
      idNo: 'ZHO-028419',
    },
    photo: {
      href: 'data:image/png;base64,PHOTO',
      width: 1200,
      height: 1600,
      faces: [{ x: 420, y: 240, w: 300, h: 300, score: 1 }],
    },
    partnerHref: 'data:image/png;base64,PARTNER',
    badgeHrefs: Array.from({ length: 8 }, (_, index) => `data:image/png;base64,BADGE${index + 1}`),
  } as const;

  it('preserves only the five canonical dynamic fields and escapes their values', () => {
    const svg = buildZhouliaTrainerCardSvg(input);

    expect(svg).toContain('>Name</text>');
    expect(svg).toContain('>Title</text>');
    expect(svg).toContain('>Feat</text>');
    expect(svg).toContain('>Partner</text>');
    expect(svg).toContain('>ID No.</text>');
    expect(svg).not.toContain('>LOCAL</');
    expect(svg).toContain('Enzo &amp; Cia');
  });

  it('locks the approved V4 badge centers without reverting to the old rail', () => {
    expect(ZHOULIA_BADGE_CENTERS).toEqual([
      [154.5, 881.5],
      [310.7857142857143, 881.5],
      [467.07142857142856, 881.5],
      [623.3571428571429, 881.5],
      [779.6428571428571, 881.5],
      [935.9285714285713, 881.5],
      [1092.2142857142858, 881.5],
      [1248.5, 881.5],
    ]);

    const svg = buildZhouliaTrainerCardSvg(input);
    for (const [index, center] of ZHOULIA_BADGE_CENTERS.entries()) {
      expect(svg).toContain(`data-badge-center="${center[0]},${center[1]}" data-slot="badge-${index + 1}"`);
    }
  });

  it('uses the coherent Surgical V3 raster as fixed visual art and does not reconstruct the header', () => {
    const svg = buildZhouliaTrainerCardSvg(input);

    expect(svg).toContain('href="/assets/journey/zhoulia-trainer-card-surgical-v3-base.png"');
    expect(svg).not.toContain('data-bind="region-name"');
    expect(svg).not.toContain('data-bind="region-emblem"');
    expect(svg).not.toContain('<path');
  });

  it('overlays the canonical Zhoulia header as approved raster art only', () => {
    const svg = buildZhouliaTrainerCardSvg(input);

    expect(svg).toContain('data-slot="fixed-header-raster"');
    expect(svg).toContain('data-slot="fixed-header-raster" x="940" y="78" width="468" height="126"');
    expect(svg).toContain('data:image/png;base64,');
    expect(svg).not.toContain('data-bind="region-name"');
    expect(svg).not.toContain('data-bind="region-emblem"');
  });

  it('uses the exact canonical photo polygon and a single source-image placement', () => {
    const svg = buildZhouliaTrainerCardSvg(input);

    expect(svg).toContain(
      'points="828.64,218.71 1223.64,218.71 1238.72,233.79 1238.72,670.27 1193.47,715.52 822.04,715.52 809.79,703.26 809.79,232.85"',
    );
    expect(svg).toContain('clip-path="url(#trainer-photo-clip)"');
    expect(svg).toContain('preserveAspectRatio="none"');
    expect(svg).not.toContain('xMidYMid slice');
  });

  it('keeps the partner independent from the trainer photo', () => {
    const svg = buildZhouliaTrainerCardSvg(input);

    expect(svg).toContain('data-slot="trainer-photo"');
    expect(svg).toContain('data-slot="partner-art"');
    expect(svg).toContain('href="data:image/png;base64,PARTNER"');
  });
});
