// Recorded, public-domain CC0 track by cynicmusic.
// License and source: https://opengameart.org/content/town-theme-rpg
export const BEYOND_MUSIC_SOURCE_URL =
  'https://opengameart.org/sites/default/files/TownTheme.mp3';
export const BEYOND_MUSIC_SOURCE_PAGE = 'https://opengameart.org/content/town-theme-rpg';

export type BeyondMusicPlaybackState = 'uninitialized' | 'running' | 'suspended' | 'closed';

export class BeyondMusicEngine {
  private audio: HTMLAudioElement | null = null;
  private volume = 0.22;
  private muted = false;
  private destroyed = false;

  get state(): BeyondMusicPlaybackState {
    if (this.destroyed) return 'closed';
    if (!this.audio) return 'uninitialized';
    return !this.audio.paused && !this.audio.ended ? 'running' : 'suspended';
  }

  async start(): Promise<BeyondMusicPlaybackState> {
    if (this.destroyed) return 'closed';
    if (!this.audio) {
      const audio = new Audio(BEYOND_MUSIC_SOURCE_URL);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = this.volume;
      audio.muted = this.muted;
      this.audio = audio;
    }

    try {
      await this.audio.play();
      return 'running';
    } catch (error) {
      const name = error !== null && typeof error === 'object' && 'name' in error
        ? String(error.name)
        : '';
      // Unmuted autoplay may require an interaction.
      return name === 'NotAllowedError' || name === 'AbortError' ? 'suspended' : 'closed';
    }
  }

  async pause(): Promise<void> {
    this.audio?.pause();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(0.65, volume));
    if (this.audio) this.audio.volume = this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.audio) this.audio.muted = muted;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    if (!this.audio) return;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio = null;
  }
}
