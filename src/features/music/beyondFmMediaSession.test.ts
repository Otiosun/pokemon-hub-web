import { afterEach, describe, expect, it, vi } from 'vitest';
import { BeyondFmMediaSession } from './beyondFmMediaSession';

afterEach(() => vi.unstubAllGlobals());

describe('Beyond FM system media controls', () => {
  function setup(options: { unsupportedNext?: boolean } = {}) {
    const handlers = new Map<string, ((details: { seekTime?: number }) => void) | null>();
    const mediaSession = {
      metadata: null as unknown,
      playbackState: 'none',
      setActionHandler: vi.fn((name: string, handler: ((details: { seekTime?: number }) => void) | null) => {
        if (name === 'nexttrack' && options.unsupportedNext) throw new Error('unsupported');
        handlers.set(name, handler);
      }),
      setPositionState: vi.fn(),
    };
    class Metadata {
      title: string;
      artist: string;
      album: string;
      artwork: MediaImage[];
      constructor(fields: MediaMetadataInit) {
        this.title = fields.title ?? '';
        this.artist = fields.artist ?? '';
        this.album = fields.album ?? '';
        this.artwork = [...(fields.artwork ?? [])];
      }
    }
    vi.stubGlobal('navigator', { mediaSession });
    vi.stubGlobal('MediaMetadata', Metadata);
    const play = vi.fn();
    const pause = vi.fn();
    const previous = vi.fn();
    const next = vi.fn();
    const seekTo = vi.fn();
    const bridge = new BeyondFmMediaSession({ play, pause, previous, next, seekTo });
    return { bridge, handlers, mediaSession, play, pause, previous, next, seekTo };
  }

  it('publishes the right track metadata and album artwork in the OS media panel', () => {
    const { bridge, mediaSession } = setup();
    bridge.updateTrack('cynthia');
    expect(mediaSession.metadata).toMatchObject({
      title: 'Cynthia · Champion Battle',
      artist: 'Qumu',
      album: 'Pokémon Beyond · Beyond FM',
      artwork: [expect.objectContaining({ type: 'image/png', sizes: '96x96' })],
    });
    bridge.updateTrack('driftveil');
    expect(mediaSession.metadata).toMatchObject({
      title: 'Driftveil City',
      artist: 'The Zame',
    });
    bridge.updatePlayback(true);
    expect(mediaSession.playbackState).toBe('playing');
    bridge.updatePlayback(false);
    expect(mediaSession.playbackState).toBe('paused');
  });

  it('routes lock-screen play/pause and next/previous into the real player actions', () => {
    const { bridge, handlers, play, pause, next, previous, seekTo } = setup();
    handlers.get('play')?.({});
    handlers.get('pause')?.({});
    handlers.get('nexttrack')?.({});
    handlers.get('previoustrack')?.({});
    handlers.get('seekto')?.({ seekTime: 46 });
    handlers.get('seekto')?.({ seekTime: Number.NaN });
    expect(play).toHaveBeenCalledExactlyOnceWith();
    expect(pause).toHaveBeenCalledExactlyOnceWith();
    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(previous).toHaveBeenCalledExactlyOnceWith();
    expect(seekTo).toHaveBeenCalledExactlyOnceWith(46);
    bridge.destroy();
    expect(handlers.get('play')).toBeNull();
    expect(handlers.get('seekto')).toBeNull();
  });

  it('reports position without invalid ranges and never throws on unsupported actions', () => {
    const { bridge, mediaSession } = setup({ unsupportedNext: true });
    bridge.updateTrack('alola');
    bridge.updatePosition(800, 260, true);
    expect(mediaSession.setPositionState).toHaveBeenCalledWith({
      duration: 260, playbackRate: 1, position: 260,
    });
    bridge.updatePosition(Number.NaN, 100, true);
    bridge.updatePosition(12, 0, true);
    expect(mediaSession.setPositionState).toHaveBeenCalledTimes(1);
    bridge.destroy();
    expect(mediaSession.playbackState).toBe('none');
    expect(mediaSession.metadata).toBeNull();
    bridge.destroy();
  });

  it('is completely optional on browsers without the Media Session API', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('MediaMetadata', undefined);
    const bridge = new BeyondFmMediaSession({
      play() {}, pause() {}, previous() {}, next() {},
    });
    expect(() => {
      bridge.updateTrack('cynthia');
      bridge.updatePlayback(true);
      bridge.updatePosition(3, 140);
      bridge.destroy();
    }).not.toThrow();
  });
});
