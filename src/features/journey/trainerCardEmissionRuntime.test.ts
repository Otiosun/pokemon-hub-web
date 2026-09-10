import { describe, expect, it } from 'vitest';
import {
  buildTrainerCardDownloadName,
  getPartnerArtworkCandidates,
  getZhouliaBadgeArtworkCandidates,
} from './trainerCardEmissionRuntime';

describe('Trainer Card emission runtime helpers', () => {
  it('prefers official artwork before HOME for the partner slot', () => {
    expect(getPartnerArtworkCandidates(58)).toEqual([
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/58.png',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/58.png',
    ]);
  });

  it('falls back to the approved Zhoulia badge raster by slot without inventing badge lore', () => {
    expect(getZhouliaBadgeArtworkCandidates(0, null)).toEqual([
      '/assets/journey/badges/zhoulia-badge-01.png',
    ]);
    expect(getZhouliaBadgeArtworkCandidates(7, '/custom/badge-eight.png')).toEqual([
      '/custom/badge-eight.png',
      '/assets/journey/badges/zhoulia-badge-08.png',
    ]);
  });

  it('does not create a fake ninth Zhoulia badge fallback', () => {
    expect(getZhouliaBadgeArtworkCandidates(8, null)).toEqual([]);
  });

  it('builds a filesystem-safe PNG filename from the trainer id', () => {
    expect(buildTrainerCardDownloadName(' ZHO/028419 ')).toBe('trainer-card-ZHO-028419.png');
    expect(buildTrainerCardDownloadName('')).toBe('trainer-card-zhoulia.png');
  });
});
