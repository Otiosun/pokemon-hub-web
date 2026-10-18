import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BEYOND_MUSIC_SETTINGS,
  applyMusicSliderValue,
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

  it('captures slider value before deferred React updater runs; volume changes preserve playback intent', () => {
    type Settings = typeof DEFAULT_BEYOND_MUSIC_SETTINGS;
    let queued: ((value: Settings) => Settings) | undefined;
    const fakeEvent: { currentTarget: { value: string } | null } = {
      currentTarget: { value: '47' },
    };
    applyMusicSliderValue(fakeEvent.currentTarget!.value, (fn) => { queued = fn; });
    fakeEvent.currentTarget = null; // Simulate the event ending before React flushes.
    expect(queued).toBeTypeOf('function');
    const previous = { enabled: true, muted: false, volume: 0.22 };
    expect(queued!(previous)).toEqual({ enabled: true, muted: false, volume: 0.47 });
    expect(previous.volume).toBe(0.22);
  });

  it('clamps slider values, accepts zero volume, and keeps state stable for no-ops', () => {
    const before = { enabled: true, muted: true, volume: 0.22 };
    for (const [raw, volume] of [['0', 0], ['65', 0.65], ['900', 0.65], ['bad', 0.22]] as const) {
      let queued: ((value: typeof before) => typeof before) | undefined;
      applyMusicSliderValue(raw, (fn) => { queued = fn; });
      expect(queued!(before)).toMatchObject({ enabled: true, muted: true, volume });
    }
    let unchanged: ((value: typeof before) => typeof before) | undefined;
    applyMusicSliderValue('22', (fn) => { unchanged = fn; });
    expect(unchanged!(before)).toBe(before);
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
