import { describe, expect, it } from 'vitest';
import {
  calculatePokemonAlphaTransform,
  type PokemonAlphaBounds,
} from './PokemonAssetImage';

const fullBounds: PokemonAlphaBounds = {
  left: 0,
  top: 0,
  right: 1,
  bottom: 1,
  sourceWidth: 100,
  sourceHeight: 100,
};

describe('calculatePokemonAlphaTransform', () => {
  it('keeps a full-frame centered artwork at its base scale', () => {
    expect(calculatePokemonAlphaTransform({
      bounds: fullBounds,
      boxWidth: 100,
      boxHeight: 100,
    })).toEqual({
      scale: 1,
      translateX: -0,
      translateY: -0,
    });
  });

  it('expands a centered subject whose alpha bounds occupy only half the source', () => {
    const transform = calculatePokemonAlphaTransform({
      bounds: {
        ...fullBounds,
        left: 0.25,
        top: 0.25,
        right: 0.75,
        bottom: 0.75,
      },
      boxWidth: 100,
      boxHeight: 100,
    });

    expect(transform?.scale).toBeCloseTo(1.88, 5);
    expect(transform?.translateX).toBeCloseTo(0, 5);
    expect(transform?.translateY).toBeCloseTo(0, 5);
  });

  it('recenters an off-axis subject while preserving its alpha-bound scale', () => {
    const transform = calculatePokemonAlphaTransform({
      bounds: {
        ...fullBounds,
        left: 0.5,
        top: 0.25,
        right: 1,
        bottom: 0.75,
      },
      boxWidth: 100,
      boxHeight: 100,
    });

    expect(transform?.scale).toBeCloseTo(1.88, 5);
    expect(transform?.translateX).toBeCloseTo(-47, 5);
    expect(transform?.translateY).toBeCloseTo(0, 5);
  });

  it('never shrinks below an existing stylesheet scale', () => {
    expect(calculatePokemonAlphaTransform({
      bounds: fullBounds,
      boxWidth: 100,
      boxHeight: 100,
      baseScale: 1.04,
    })?.scale).toBeCloseTo(1.04, 5);
  });
});
