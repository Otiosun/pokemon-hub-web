import { afterEach, describe, expect, it, vi } from 'vitest';
import { BeyondFmPlaylistEngine } from './beyondFmPlaylistEngine';
import { BEYOND_FM_TRACKS } from './beyondFmLibrary';

afterEach(() => vi.unstubAllGlobals());

describe('Beyond FM media fallback', () => {
  it('recovers from a rejected blob URL by playing local audio as a data URL', async () => {
    class MediaStub {
      src: string;
      paused = true;
      ended = false;
      duration = 7;
      currentTime = 2.2;
      networkState = 1;
      readyState = 4;
      error: MediaError | null = null;
      loop = false;
      preload = '';
      volume = 1;
      muted = false;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onplaying: (() => void) | null = null;
      constructor(src: string) { this.src = src; }
      canPlayType() { return 'probably'; }
      async play() {
        if (this.src.startsWith('blob:')) {
          const error = new Error('Source not supported');
          error.name = 'NotSupportedError';
          throw error;
        }
        this.paused = false;
        this.onplaying?.();
      }
      pause() { this.paused = true; }
      removeAttribute(attr: string) { if (attr === 'src') this.src = ''; }
      load() {}
    }
    class ReaderStub {
      result: string | null = null;
      error: Error | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = 'data:audio/mpeg;base64,SUQz';
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Audio', MediaStub);
    vi.stubGlobal('FileReader', ReaderStub);
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:broken',
      revokeObjectURL: () => {},
    });
    const changes: string[] = [];
    const engine = new BeyondFmPlaylistEngine(() => {}, (state) => changes.push(state));
    engine.install(BEYOND_FM_TRACKS.map(track => ({
      id: track.id,
      blob: new Blob(['ID3data'], { type: 'audio/mpeg' }),
    })));
    expect(await engine.start()).toBe('running');
    expect(engine.state).toBe('running');
    expect(engine.playbackIssue).toBe('');
    expect(engine.playbackDiagnostic).toBe('');
    expect(engine.progress).toBeGreaterThan(0);
    expect(changes).toContain('running');
    engine.destroy();
  });
});
