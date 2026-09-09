import { describe, expect, it } from 'vitest';
import {
  buildTrainerCardDownloadName,
  getPartnerArtworkCandidates,
} from './trainerCardEmissionRuntime';

describe('Trainer Card emission runtime helpers', () => {
  it('prefers official artwork before HOME for the partner slot', () => {
    expect(getPartnerArtworkCandidates(58)).toEqual([
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/58.png',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/58.png',
    ]);
  });

  it('builds a filesystem-safe PNG filename from the trainer id', () => {
    expect(buildTrainerCardDownloadName(' ZHO/028419 ')).toBe('trainer-card-ZHO-028419.png');
    expect(buildTrainerCardDownloadName('')).toBe('trainer-card-zhoulia.png');
  });
});
