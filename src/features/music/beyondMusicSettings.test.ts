import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BEYOND_MUSIC_SETTINGS,
  clampMusicVolume,
  sanitizeBeyondMusicSettings,
} from './beyondMusicSettings';

describe('Beyond music settings', () => {
  it('defaults to active, audible background music', () => {
    expect(DEFAULT_BEYOND_MUSIC_SETTINGS).toEqual({
      enabled: true,
      muted: false,
      volume: 0.22,
    });
  });

  it('clamps persisted volume to the safe player range', () => {
    expect(clampMusicVolume(-1)).toBe(0);
    expect(clampMusicVolume(4)).toBe(0.65);
    expect(clampMusicVolume(0.31)).toBe(0.31);
  });

  it('sanitizes malformed persisted preferences', () => {
    expect(sanitizeBeyondMusicSettings({ enabled: false, muted: true, volume: 9 })).toEqual({
      enabled: false,
      muted: true,
      volume: 0.65,
    });
    expect(sanitizeBeyondMusicSettings('broken')).toEqual(DEFAULT_BEYOND_MUSIC_SETTINGS);
  });
});
