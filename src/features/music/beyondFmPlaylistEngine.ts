import { shuffleFmBag } from './beyondFmShuffle';
import type { BeyondFmTrackId, LocalFmTrack } from './beyondFmLibrary';

export type FmPlaybackState = 'uninitialized' | 'running' | 'suspended' | 'closed';
const LAST_TRACK_KEY = 'pokemon-beyond:fm-last-track:v1';

export class BeyondFmPlaylistEngine {
  private tracks = new Map<BeyondFmTrackId, Blob>();
  private nextBag: BeyondFmTrackId[] = [];
  private history: BeyondFmTrackId[] = [];
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private active: BeyondFmTrackId | null = null;
  private lastTrack: BeyondFmTrackId | null = null;
  private volume = 0.22;
  private muted = false;
  private destroyed = false;
  private readonly onTrackChange: (id: BeyondFmTrackId) => void;
  private readonly onPlaybackChange: (state: FmPlaybackState) => void;

  constructor(onTrackChange: (id: BeyondFmTrackId) => void = () => {},
    onPlaybackChange: (state: FmPlaybackState) => void = () => {}) {
    this.onTrackChange = onTrackChange;
    this.onPlaybackChange = onPlaybackChange;
    try {
      const saved = localStorage.getItem(LAST_TRACK_KEY);
      if (saved === 'cynthia' || saved === 'national-park' || saved === 'driftveil' || saved === 'alola') {
        this.lastTrack = saved;
      }
    } catch { /* Persistence is optional. */ }
  }

  get hasTracks() { return this.tracks.size === 4; }
  get trackId() { return this.active; }
  get duration() { return this.audio?.duration ?? 0; }
  get currentTime() { return this.audio?.currentTime ?? 0; }
  get progress() {
    const duration = this.duration;
    return Number.isFinite(duration) && duration > 0
      ? Math.max(0, Math.min(1, this.currentTime / duration)) : 0;
  }
  get state(): FmPlaybackState {
    if (this.destroyed) return 'closed';
    if (!this.audio) return 'uninitialized';
    return !this.audio.paused && !this.audio.ended ? 'running' : 'suspended';
  }

  install(tracks: readonly LocalFmTrack[]) {
    if (this.destroyed) return;
    this.disposeAudio();
    this.tracks = new Map(tracks.map((track) => [track.id, track.blob]));
    this.nextBag = [];
    this.history = [];
    this.active = null;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(0.65, volume));
    if (this.audio) this.audio.volume = this.volume;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.audio) this.audio.muted = muted;
  }

  private disposeAudio() {
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private loadTrack(id: BeyondFmTrackId, remember = true) {
    const blob = this.tracks.get(id);
    if (!blob) return false;
    if (remember && this.active) this.history.push(this.active);
    this.disposeAudio();
    this.objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(this.objectUrl);
    audio.preload = 'auto';
    audio.loop = false;
    audio.volume = this.volume;
    audio.muted = this.muted;
    audio.onended = () => { void this.next(); };
    audio.onerror = () => this.onPlaybackChange('closed');
    this.audio = audio;
    this.active = id;
    this.lastTrack = id;
    try { localStorage.setItem(LAST_TRACK_KEY, id); } catch { /* Optional. */ }
    this.onTrackChange(id);
    return true;
  }

  private takeNext(): BeyondFmTrackId | null {
    if (!this.hasTracks) return null;
    if (!this.nextBag.length) {
      this.nextBag = shuffleFmBag([...this.tracks.keys()], this.active ?? this.lastTrack);
    }
    return this.nextBag.shift() ?? null;
  }

  async start(): Promise<FmPlaybackState> {
    if (this.destroyed) return 'closed';
    if (!this.hasTracks) return 'suspended';
    if (!this.audio) {
      const next = this.takeNext();
      if (!next || !this.loadTrack(next)) return 'closed';
    }
    try {
      await this.audio!.play();
      this.onPlaybackChange('running');
      return 'running';
    } catch (error) {
      const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
      const status: FmPlaybackState = name === 'NotAllowedError' || name === 'AbortError' ? 'suspended' : 'closed';
      this.onPlaybackChange(status);
      return status;
    }
  }

  async next(): Promise<FmPlaybackState> {
    const next = this.takeNext();
    if (!next || !this.loadTrack(next)) return 'closed';
    return this.start();
  }

  async previous(): Promise<FmPlaybackState> {
    if (this.audio && this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return this.start();
    }
    const previous = this.history.pop();
    if (!previous) {
      if (this.audio) this.audio.currentTime = 0;
      return this.start();
    }
    if (this.active) this.nextBag.unshift(this.active);
    if (!this.loadTrack(previous, false)) return 'closed';
    return this.start();
  }

  async select(id: BeyondFmTrackId): Promise<FmPlaybackState> {
    if (!this.tracks.has(id)) return 'closed';
    if (id === this.active) return this.start();
    this.nextBag = this.nextBag.filter((candidate) => candidate !== id);
    if (!this.loadTrack(id)) return 'closed';
    return this.start();
  }

  pause() {
    this.audio?.pause();
    this.onPlaybackChange('suspended');
  }

  destroy() {
    this.destroyed = true;
    this.disposeAudio();
    this.nextBag = [];
    this.history = [];
    this.tracks.clear();
  }
}
