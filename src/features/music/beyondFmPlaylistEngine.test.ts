import { afterEach, describe, expect, it, vi } from 'vitest';
import { BeyondFmPlaylistEngine } from './beyondFmPlaylistEngine';
import { BEYOND_FM_TRACKS, PUBLIC_FM_SOURCE_URL } from './beyondFmLibrary';
afterEach(() => vi.unstubAllGlobals());
describe('Beyond FM shuffled audio engine', () => {
  it('plays five songs including the CC0 track without repeating, and keeps pause/resume state', async () => {
    let serial = 0;
    const audioInstances: AudioStub[] = [];
    const createdAudioSources: string[] = [];
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
      constructor(src: string) { this.src = src; audioInstances.push(this); createdAudioSources.push(src); }
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
    engine.seekTo(52);
    expect(playingAudio.currentTime).toBe(52);
    engine.seekTo(500);
    expect(playingAudio.currentTime).toBe(90);
    engine.seekTo(-4);
    expect(playingAudio.currentTime).toBe(0);
    engine.seekTo(37);
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
    await engine.next();
    expect(selected).toHaveLength(5);
    expect(new Set(selected).size).toBe(5);
    expect(selected).toContain('town-theme');
    expect(createdAudioSources).toContain(PUBLIC_FM_SOURCE_URL);
    expect(engine.hasPersonalLibrary).toBe(true);
    const beforeReplacement = engine.trackId;
    const sameAudio = audioInstances.at(-1);
    const intact = await engine.replaceTrack({
      id: 'alola' === beforeReplacement ? 'cynthia' : 'alola',
      blob: new Blob([new Uint8Array(12800)], { type: 'audio/mpeg' }),
    });
    expect(intact).toBe('running');
    expect(engine.trackId).toBe(beforeReplacement);
    expect(audioInstances.at(-1)).toBe(sameAudio);
    expect(engine.hasTracks).toBe(true);
    await engine.next();
    expect(engine.trackId).not.toBe(selected[4]);
    const previousRevoked = revoked.length;
    engine.destroy();
    expect(engine.state).toBe('closed');
    expect(revoked.length).toBeGreaterThanOrEqual(previousRevoked);
    // The remote CC0 stream does not create or revoke local blob URLs.
    const publicOnly = new BeyondFmPlaylistEngine();
    publicOnly.installPublic();
    expect(publicOnly.isPublicStation).toBe(true);
    expect(publicOnly.hasPersonalLibrary).toBe(false);
    expect(await publicOnly.start()).toBe('running');
    expect(audioInstances.at(-1)?.src).toBe(PUBLIC_FM_SOURCE_URL);
    expect(audioInstances.at(-1)?.loop).toBe(true);
    publicOnly.destroy();
  });
});
