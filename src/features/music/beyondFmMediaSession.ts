import { BEYOND_FM_TRACKS, type BeyondFmTrackId } from './beyondFmLibrary';

export interface BeyondFmSystemControls {
  play(): void;
  pause(): void;
  previous(): void;
  next(): void;
  seekTo?(seconds: number): void;
}

/**
 * Bridges the local FM engine to OS/browser media controls.
 * Optional by design: unsupported or partially supported browsers must never
 * prevent the local HTMLAudioElement from working.
 */
export class BeyondFmMediaSession {
  private readonly session: MediaSession | null;
  private lastTrack: BeyondFmTrackId | null = null;
  private lastPositionAt = 0;
  private lastDuration = 0;
  private disposed = false;

  constructor(controls: BeyondFmSystemControls) {
    this.session = typeof navigator !== 'undefined' && 'mediaSession' in navigator
      ? navigator.mediaSession
      : null;
    if (!this.session) return;
    const actions: ReadonlyArray<[MediaSessionAction, () => void]> = [
      ['play', controls.play],
      ['pause', controls.pause],
      ['previoustrack', controls.previous],
      ['nexttrack', controls.next],
    ];
    for (const [name, callback] of actions) {
      try { this.session.setActionHandler(name, callback); }
      catch { /* One unsupported action must not disable the others. */ }
    }
    if (controls.seekTo) {
      try {
        this.session.setActionHandler('seekto', (details) => {
          if (typeof details.seekTime === 'number' && Number.isFinite(details.seekTime)) {
            controls.seekTo?.(details.seekTime);
          }
        });
      } catch { /* Seek may not be available on all devices. */ }
    }
  }

  updateTrack(id: BeyondFmTrackId) {
    if (!this.session || this.disposed || this.lastTrack === id ||
        typeof MediaMetadata === 'undefined') return;
    const track = BEYOND_FM_TRACKS.find((entry) => entry.id === id);
    if (!track) return;
    try {
      this.session.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Pokémon Beyond · Beyond FM',
        artwork: [{
          src: new URL('/beyond-fm-cover.png', document.baseURI).href,
          sizes: '192x192',
          type: 'image/png',
        }],
      });
      this.lastTrack = id;
      this.lastPositionAt = 0;
      this.lastDuration = 0;
    } catch { /* Artwork/metadata support differs between platforms. */ }
  }

  updatePlayback(playing: boolean) {
    if (!this.session || this.disposed) return;
    try { this.session.playbackState = playing ? 'playing' : 'paused'; }
    catch { /* Non-critical: audio must continue normally. */ }
  }

  updatePosition(position: number, duration: number, force = false) {
    if (!this.session || this.disposed || !Number.isFinite(duration) ||
        duration <= 0 || !Number.isFinite(position)) return;
    const now = typeof performance === 'undefined' ? Date.now() : performance.now();
    if (!force && duration === this.lastDuration && now - this.lastPositionAt < 1500) return;
    try {
      this.session.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.max(0, Math.min(duration, position)),
      });
      this.lastPositionAt = now;
      this.lastDuration = duration;
    } catch { /* Unsupported on some mobile/desktop browsers. */ }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    if (!this.session) return;
    for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'] as const) {
      try { this.session.setActionHandler(action, null); }
      catch { /* Handler may not have been supported. */ }
    }
    try {
      this.session.metadata = null;
      this.session.playbackState = 'none';
    } catch { /* Page navigation must not fail on an unsupported platform. */ }
  }
}
