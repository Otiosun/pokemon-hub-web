import { shuffleFmBag } from './beyondFmShuffle';
import { BEYOND_FM_TRACKS, HOSTED_FM_TRACK_URLS, PUBLIC_FM_SOURCE_URL, type BeyondFmTrackId, type LocalFmTrack } from './beyondFmLibrary';

export type FmPlaybackState = 'uninitialized' | 'running' | 'suspended' | 'closed';
const LAST_TRACK_KEY = 'pokemon-beyond:fm-last-track:v1';

export class BeyondFmPlaylistEngine {
  private tracks = new Map<BeyondFmTrackId, Blob | string>();
  private nextBag: BeyondFmTrackId[] = [];
  private history: BeyondFmTrackId[] = [];
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private active: BeyondFmTrackId | null = null;
  private lastTrack: BeyondFmTrackId | null = null;
  private volume = 0.22;
  private muted = false;
  private destroyed = false;
  private hosted = false;
  private issue = '';
  private loadingFallback = false;
  private lastDiagnostic = '';
  private sourceMode: 'blob' | 'data' = 'blob';
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

  get hasTracks() { return this.tracks.has('town-theme') && (this.tracks.size === 1 || this.tracks.size === 5); }
  get isPublicStation() { return this.tracks.size === 1 && this.tracks.has('town-theme'); }
  get hasPersonalLibrary() { return this.tracks.size === 5; }
  get isHostedLibrary() { return this.hosted && this.hasTracks; }
  get trackId() { return this.active; }
  get playbackIssue() { return this.issue; }
  get playbackDiagnostic() { return this.lastDiagnostic; }
  get mp3Recommended() { const source = this.active ? this.tracks.get(this.active) : null; return source instanceof Blob && source.type !== 'audio/mpeg'; }
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
    this.hosted = false;
    // The public CC0 track is ALWAYS part of the shuffle bag, alongside the
    // four locally stored tracks. Nothing from the personal library is uploaded.
    this.tracks = new Map<BeyondFmTrackId, Blob | string>([
      ...tracks.map((track) => [track.id, track.blob] as [BeyondFmTrackId, Blob]),
      ['town-theme', PUBLIC_FM_SOURCE_URL],
    ]);
    this.nextBag = [];
    this.history = [];
    this.active = null;
    this.issue = '';
    this.lastDiagnostic = '';
    this.sourceMode = 'blob';
  }

  /** Hosted MP3 files stream from Vercel; no per-device import is required. */
  installHosted() {
    if (this.destroyed) return;
    this.disposeAudio();
    this.tracks = new Map<BeyondFmTrackId, Blob | string>([
      ...BEYOND_FM_TRACKS.map((track) => [track.id, HOSTED_FM_TRACK_URLS[track.id as Exclude<BeyondFmTrackId, 'town-theme'>]] as [BeyondFmTrackId, string]),
      ['town-theme', PUBLIC_FM_SOURCE_URL],
    ]);
    this.nextBag = [];
    this.history = [];
    this.active = null;
    this.issue = '';
    this.lastDiagnostic = '';
    this.hosted = true;
    this.sourceMode = 'blob';
  }

  /** Hot-swap only the chosen track. Other song blobs and the shuffle bag
   * survive unchanged. If the replaced track is active, reload it safely.
   */
  async replaceTrack(track: LocalFmTrack): Promise<FmPlaybackState> {
    if (this.destroyed || !this.hasTracks || !this.tracks.has(track.id)) return 'closed';
    this.tracks.set(track.id, track.blob);
    if (this.active !== track.id) return this.state;
    const wasPlaying = this.state === 'running';
    if (!this.loadTrack(track.id, false)) return 'closed';
    if (!wasPlaying) {
      this.onPlaybackChange('suspended');
      return 'suspended';
    }
    return this.start();
  }

  installPublic() {
    if (this.destroyed) return;
    this.disposeAudio();
    this.hosted = false;
    this.tracks = new Map([['town-theme', PUBLIC_FM_SOURCE_URL]]);
    this.nextBag = [];
    this.history = [];
    this.active = null;
    this.issue = '';
    this.sourceMode = 'blob';
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
    const source = typeof blob === 'string' ? blob : URL.createObjectURL(blob);
    this.objectUrl = typeof blob === 'string' ? null : source;
    const audio = new Audio(source);
    audio.preload = 'auto';
    audio.loop = this.isPublicStation;
    audio.volume = this.volume;
    audio.muted = this.muted;
    audio.onended = () => { if (!this.isPublicStation) void this.next(); };
    audio.onerror = () => {
      if (this.loadingFallback || this.audio !== audio) return;
      // Include the actual media error without exposing local file data.
      const code = audio.error?.code;
      this.issue = this.isPublicStation
        ? 'Rádio pública indisponível no momento. Verifique a conexão e tente novamente.'
        : this.isHostedLibrary
        ? 'Não foi possível carregar a música do servidor. Verifique sua conexão e tente novamente.'
        : this.mp3Recommended
        ? 'O navegador recusou esta faixa M4A. Use SUBSTITUIR POR MP3 e importe o pacote MP3 compatível.'
        : code === 3 || code === 4
          ? 'O navegador não conseguiu decodificar a faixa MP3. Experimente atualizar o navegador ou reimportar o pacote.'
          : 'Não foi possível carregar esta música. Experimente importar o pacote MP3 novamente.';
      this.lastDiagnostic = this.describeAudioFailure(audio);
      this.onPlaybackChange('closed');
    };
    audio.onplaying = () => {
      this.issue = '';
      this.lastDiagnostic = '';
      this.onPlaybackChange('running');
    };
    this.audio = audio;
    this.sourceMode = 'blob';
    this.lastDiagnostic = '';
    this.issue = '';
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

  private describeAudioFailure(audio: HTMLAudioElement): string {
    const blob = this.active ? this.tracks.get(this.active) : null;
    const mime = blob instanceof Blob ? blob.type || 'sem MIME' : 'audio/mpeg';
    const canPlay = audio.canPlayType(mime || 'audio/mpeg') || 'não';
    const name = this.active ?? 'desconhecida';
    return [
      'faixa=' + name,
      'fonte=' + this.sourceMode,
      'tipo=' + mime,
      'bytes=' + String(blob instanceof Blob ? blob.size : 0),
      'codec=' + canPlay,
      'erro=' + String(audio.error?.code ?? 0),
      'rede=' + audio.networkState,
      'pronto=' + audio.readyState,
    ].join(' | ');
  }

  private async retryAsDataUrl(audio: HTMLAudioElement): Promise<boolean> {
    const blob = this.active ? this.tracks.get(this.active) : null;
    if (!(blob instanceof Blob) || blob.size > 13_000_000 || typeof FileReader === 'undefined') return false;
    this.loadingFallback = true;
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('Arquivo não pôde ser lido.'));
        reader.onerror = () => reject(reader.error ?? new Error('Arquivo não pôde ser lido.'));
        reader.readAsDataURL(blob);
      });
      if (this.audio !== audio || this.destroyed) return false;
      this.sourceMode = 'data';
      audio.src = url;
      audio.load();
      await audio.play();
      this.issue = '';
      this.lastDiagnostic = '';
      this.onPlaybackChange('running');
      return true;
    } catch {
      if (this.audio === audio) this.lastDiagnostic = this.describeAudioFailure(audio);
      return false;
    } finally {
      this.loadingFallback = false;
    }
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
      this.issue = '';
      this.onPlaybackChange('running');
      return 'running';
    } catch (error) {
      const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
      if (name === 'NotSupportedError' && this.audio && this.sourceMode === 'blob') {
        const playable = await this.retryAsDataUrl(this.audio);
        if (playable) return 'running';
      }
      const status: FmPlaybackState = name === 'NotAllowedError' || name === 'AbortError' ? 'suspended' : 'closed';
      this.lastDiagnostic = this.audio ? this.describeAudioFailure(this.audio) : 'audio=null';
      this.issue = this.isPublicStation && status === 'closed'
        ? 'Não foi possível carregar a rádio pública. Verifique sua conexão.'
        : name === 'NotAllowedError'
        ? 'O navegador bloqueou o som automático. Clique em Play novamente.'
        : name === 'NotSupportedError'
          ? 'O navegador recusou o áudio nas duas formas de reprodução. Consulte o diagnóstico abaixo.'
          : status === 'closed'
            ? 'A reprodução falhou. Consulte o diagnóstico abaixo.'
            : '';
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

  seekTo(seconds: number): void {
    if (!this.audio || !Number.isFinite(seconds)) return;
    const duration = this.audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    try {
      this.audio.currentTime = Math.max(0, Math.min(duration, seconds));
    } catch {
      // Streaming/decoding states can temporarily reject seeking.
    }
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
