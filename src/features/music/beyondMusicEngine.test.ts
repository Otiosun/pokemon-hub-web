import { afterEach, describe, expect, it, vi } from 'vitest';
import { BEYOND_MUSIC_SOURCE_URL, BeyondMusicEngine } from './beyondMusicEngine';

afterEach(() => vi.unstubAllGlobals());

describe('Beyond music playback', () => {
  it('plays one recorded CC0 track with looping, volume, and mute controls', async () => {
    const instances: FakeAudio[] = [];
    class FakeAudio {
      public src: string;
      public loop = false;
      public preload = '';
      public volume = 1;
      public muted = false;
      public paused = true;
      public ended = false;
      public constructor(src: string) { this.src = src; instances.push(this); }
      public async play() { this.paused = false; }
      public pause() { this.paused = true; }
      public removeAttribute(name: string) { if (name === 'src') this.src = ''; }
    }
    vi.stubGlobal('Audio', FakeAudio);
    const music = new BeyondMusicEngine();
    expect(music.state).toBe('uninitialized');
    music.setVolume(0.31);
    music.setMuted(true);
    expect(await music.start()).toBe('running');
    expect(instances[0]?.src).toBe(BEYOND_MUSIC_SOURCE_URL);
    expect(instances[0]?.loop).toBe(true);
    expect(instances[0]?.volume).toBe(0.31);
    expect(instances[0]?.muted).toBe(true);
    await music.pause();
    expect(music.state).toBe('suspended');
    await music.destroy();
    expect(music.state).toBe('closed');
  });

  it('maps the electric border to real playback time and preserves position on pause', async () => {
    const instances: FakeAudio[] = [];
    class FakeAudio {
      public currentTime = 0;
      public duration = Number.NaN;
      public loop = false;
      public preload = '';
      public volume = 1;
      public muted = false;
      public paused = true;
      public ended = false;
      public constructor(_src: string) { instances.push(this); }
      public async play() { this.paused = false; }
      public pause() { this.paused = true; }
      public removeAttribute(_name: string) {}
    }
    vi.stubGlobal('Audio', FakeAudio);
    const music = new BeyondMusicEngine();
    expect(music.progress).toBe(0);
    await music.start();
    const audio = instances[0]!;
    expect(music.progress).toBe(0);
    audio.duration = 120;
    audio.currentTime = 30;
    expect(music.progress).toBe(0.25);
    await music.pause();
    expect(music.progress).toBe(0.25);
    audio.currentTime = 120;
    expect(music.progress).toBe(1);
    audio.currentTime = 0;
    expect(music.progress).toBe(0);
    audio.duration = Number.POSITIVE_INFINITY;
    expect(music.progress).toBe(0);
    await music.destroy();
    expect(music.progress).toBe(0);
  });
});
