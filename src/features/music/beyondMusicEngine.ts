const BPM = 126;
const BEAT_SECONDS = 60 / BPM;
const BARS_PER_LOOP = 16;
const LOOP_SECONDS = BARS_PER_LOOP * 4 * BEAT_SECONDS;

const CHORDS: readonly [readonly number[], number][] = [
  [[59, 62, 66], 47],
  [[55, 59, 62], 43],
  [[50, 54, 57], 38],
  [[57, 61, 64], 45],
  [[59, 62, 66], 47],
  [[55, 59, 62], 43],
  [[50, 54, 57], 38],
  [[57, 61, 64], 45],
  [[59, 62, 66], 47],
  [[55, 59, 62], 43],
  [[50, 54, 57], 38],
  [[57, 61, 64], 45],
  [[59, 62, 66], 47],
  [[55, 59, 62], 43],
  [[50, 54, 57], 38],
  [[57, 61, 64], 45],
] as const;

const MELODY_PHRASES: readonly (readonly number[])[] = [
  [71, 74, 78, 76, 74, 71, 69, 71, 74, 76, 78, 81, 78, 76, 74, 71],
  [67, 71, 74, 76, 74, 71, 69, 67, 69, 71, 74, 76, 74, 71, 69, 66],
  [69, 74, 78, 81, 78, 76, 74, 71, 74, 78, 81, 83, 81, 78, 76, 74],
  [69, 73, 76, 78, 76, 73, 71, 69, 73, 76, 78, 81, 78, 76, 73, 71],
] as const;

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export class BeyondMusicEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private nextLoopStart = 0;
  private volume = 0.22;
  private muted = false;
  private destroyed = false;

  get state(): AudioContextState | 'uninitialized' {
    return this.context?.state ?? 'uninitialized';
  }

  async start(): Promise<AudioContextState> {
    if (this.destroyed) return 'closed';
    this.ensureContext();
    if (!this.context) return 'closed';

    try {
      await this.context.resume();
    } catch {
      // Browsers may reject resume outside a user gesture; the first interaction retries it.
    }

    if (this.context.state !== 'running') return this.context.state;

    if (this.nextLoopStart === 0) {
      this.nextLoopStart = this.context.currentTime + 0.08;
      this.scheduleLoop(this.nextLoopStart);
      this.nextLoopStart += LOOP_SECONDS;
      this.startScheduler();
    }

    return this.context.state;
  }

  async pause(): Promise<void> {
    if (!this.context || this.context.state !== 'running') return;
    try {
      await this.context.suspend();
    } catch {
      // Audio suspension is best effort; UI state still remains authoritative.
    }
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.applyGain();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGain();
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (this.context && this.context.state !== 'closed') {
      try {
        await this.context.close();
      } catch {
        // Nothing else to release if the browser already disposed the context.
      }
    }
    this.context = null;
    this.master = null;
  }

  private ensureContext(): void {
    if (this.context || this.destroyed) return;
    this.context = new AudioContext({ latencyHint: 'playback' });
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.context.destination);
  }

  private applyGain(): void {
    if (!this.context || !this.master) return;
    const target = this.muted ? 0 : this.volume;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.025);
  }

  private startScheduler(): void {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      const context = this.context;
      if (!context || context.state !== 'running' || this.destroyed) return;
      while (this.nextLoopStart - context.currentTime < 6) {
        this.scheduleLoop(this.nextLoopStart);
        this.nextLoopStart += LOOP_SECONDS;
      }
    }, 1000);
  }

  private scheduleLoop(loopStart: number): void {
    for (let bar = 0; bar < CHORDS.length; bar += 1) {
      const [chord, bass] = CHORDS[bar]!;
      const barStart = loopStart + bar * 4 * BEAT_SECONDS;

      for (let step = 0; step < 8; step += 1) {
        const note = chord[step % chord.length]! + 12;
        this.scheduleTone(barStart + step * 0.5 * BEAT_SECONDS, 0.38 * BEAT_SECONDS, note, 0.055, 'square');
      }

      for (let beat = 0; beat < 4; beat += 1) {
        this.scheduleTone(barStart + beat * BEAT_SECONDS, 0.82 * BEAT_SECONDS, bass, 0.105, 'triangle');
      }
    }

    for (let segment = 0; segment < 8; segment += 1) {
      const phrase = MELODY_PHRASES[segment % MELODY_PHRASES.length]!;
      const segmentStart = loopStart + segment * 8 * BEAT_SECONDS;
      for (let index = 0; index < phrase.length; index += 1) {
        if ((index === 6 || index === 15) && segment % 2 === 1) continue;
        const duration = (index % 4 === 3 ? 0.46 : 0.36) * BEAT_SECONDS;
        this.scheduleTone(
          segmentStart + index * 0.5 * BEAT_SECONDS,
          duration,
          phrase[index]!,
          0.075,
          'square',
        );
      }
    }
  }

  private scheduleTone(
    start: number,
    duration: number,
    midi: number,
    amplitude: number,
    type: OscillatorType,
  ): void {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(midiToHz(midi), start);

    const attackEnd = start + Math.min(0.018, duration * 0.2);
    const releaseStart = Math.max(attackEnd, start + duration - Math.min(0.08, duration * 0.35));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(amplitude, attackEnd);
    gain.gain.setValueAtTime(amplitude, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      gain.disconnect();
    });
  }
}
