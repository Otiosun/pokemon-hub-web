import { afterEach, describe, expect, it, vi } from 'vitest';
import { BeyondFmPlaylistEngine } from './beyondFmPlaylistEngine';
import { BEYOND_FM_TRACKS } from './beyondFmLibrary';
afterEach(() => vi.unstubAllGlobals());
describe('Beyond FM shuffled audio engine', () => {
  it('plays all four without repeating, and keeps pause/resume state', async () => {
    let serial = 0;
    const audioInstances: AudioStub[] = [];
    class AudioStub {
      src: string;
      loop = false;
      preload = '';
      volume = 1;
      muted = false;
      paused = true;
      ended = false;
      duration = 90;
      currentTime = 0;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(src: string) { this.src = src; audioInstances.push(this); }
      async play() { this.paused = false; }
      pause() { this.paused = true; }
      removeAttribute(name: string) { if (name === 'src') this.src = ''; }
      load() {}
    }
    vi.stubGlobal('Audio', AudioStub);
    const revoked: string[] = [];
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:test-' + serial++,
      revokeObjectURL: (url: string) => { revoked.push(url); },
    });
    const selected: string[] = [];
    const engine = new BeyondFmPlaylistEngine((id) => selected.push(id));
    engine.install(BEYOND_FM_TRACKS.map((track) => ({ id: track.id, blob: new Blob([track.id]) })));
    engine.setVolume(0.31);
    engine.setMuted(true);
    expect(engine.hasTracks).toBe(true);
    expect(await engine.start()).toBe('running');
    const playingAudio = audioInstances[0]!;
    playingAudio.currentTime = 37;
    const playingTrack = engine.trackId;
    engine.setVolume(0.57);
    expect(playingAudio.volume).toBe(0.57);
    expect(playingAudio.currentTime).toBe(37);
    expect(playingAudio.paused).toBe(false);
    expect(engine.trackId).toBe(playingTrack);
    expect(engine.state).toBe('running');
    expect(revoked).toHaveLength(0);
    engine.pause();
    expect(engine.state).toBe('suspended');
    expect(await engine.start()).toBe('running');
    await engine.next();
    await engine.next();
    await engine.next();
    expect(selected).toHaveLength(4);
    expect(new Set(selected).size).toBe(4);
    await engine.next();
    expect(engine.trackId).not.toBe(selected[3]);
    expect(revoked.length).toBe(4);
    engine.destroy();
    expect(engine.state).toBe('closed');
    expect(revoked.length).toBe(5);
  });
});
