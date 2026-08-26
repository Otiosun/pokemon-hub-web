import { describe, expect, it } from 'vitest';
import { getSpeciesPlayerStatePreview } from './speciesPlayerStatePreview';

describe('species player-state preview', () => {
  it('treats an owned species as caught and keeps owned count', () => {
    const state = getSpeciesPlayerStatePreview(4);
    expect(state.discovery).toBe('caught');
    expect(state.ownedCount).toBe(1);
    expect(state.researchLevel).toBeGreaterThanOrEqual(2);
  });

  it('keeps seen-only species separate from caught species', () => {
    const state = getSpeciesPlayerStatePreview(245);
    expect(state.discovery).toBe('seen');
    expect(state.ownedCount).toBe(0);
    expect(state.researchLevel).toBe(1);
  });

  it('does not reveal unregistered species state', () => {
    const state = getSpeciesPlayerStatePreview(15);
    expect(state.discovery).toBe('unknown');
    expect(state.researchLevel).toBe(0);
    expect(state.ownedCount).toBe(0);
  });

  it('tracks shiny ownership only on the matching species', () => {
    expect(getSpeciesPlayerStatePreview(197).shinyOwned).toBe(true);
    expect(getSpeciesPlayerStatePreview(4).shinyOwned).toBe(false);
  });
});
