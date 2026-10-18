import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BEYOND_MUSIC_SOURCE_PAGE, BeyondMusicEngine } from './beyondMusicEngine';
import { MUSIC_DEMO_DURATION_MS, MUSIC_DEMO_HOLD_MS, demoProgressAt } from './musicProgressDemo';
import { expandedMusicOutline, musicProgressStroke } from './musicExpandedOutline';
import {
  BEYOND_MUSIC_STORAGE_KEY,
  DEFAULT_BEYOND_MUSIC_SETTINGS,
  type BeyondMusicSettings,
  sanitizeBeyondMusicSettings,
} from './beyondMusicSettings';
import './beyond-music-player.css';

type PlaybackStatus = 'starting' | 'playing' | 'waiting' | 'paused' | 'unavailable';

const ROTOM_SPRITE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/479.png';

function loadSettings(): BeyondMusicSettings {
  if (typeof window === 'undefined') return DEFAULT_BEYOND_MUSIC_SETTINGS;
  try {
    const stored = window.localStorage.getItem(BEYOND_MUSIC_STORAGE_KEY);
    return stored ? sanitizeBeyondMusicSettings(JSON.parse(stored)) : DEFAULT_BEYOND_MUSIC_SETTINGS;
  } catch {
    return DEFAULT_BEYOND_MUSIC_SETTINGS;
  }
}


/**
 * Both player sizes use exactly the SAME path-length-based progress algorithm.
 * No SVG rect pathLength calibration and no guessed perimeter. A given fraction
 * occupies the same percentage on both outlines regardless of shape or size.
 */
function MusicElectricProgressFrame({
  progress,
  playing,
  compact,
}: {
  progress: number;
  playing: boolean;
  compact: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const chargeRef = useRef<SVGPathElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [perimeter, setPerimeter] = useState(0);

  useLayoutEffect(() => {
    const wrapper = svgRef.current?.parentElement;
    if (!wrapper) return;
    const measure = () => {
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      setDimensions((old) => (old.width === width && old.height === height ? old : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const cornerRadius = compact ? (dimensions.width <= 43 ? 10.5 : 12.5) : 10.5;
  const outline = expandedMusicOutline(dimensions.width, dimensions.height, cornerRadius);

  useLayoutEffect(() => {
    setPerimeter(outline ? (chargeRef.current?.getTotalLength() ?? 0) : 0);
  }, [outline]);

  const { dasharray, dashoffset, visible } = musicProgressStroke(perimeter, progress);
  return (
    <svg
      ref={svgRef}
      className={`beyond-music-electric-frame${compact ? '' : ' beyond-music-electric-frame--expanded'}${playing ? ' is-playing' : ''}`}
      viewBox={`0 0 ${Math.max(1, dimensions.width)} ${Math.max(1, dimensions.height)}`}
      preserveAspectRatio="none" aria-hidden="true" focusable="false"
    >
      {outline ? (
        <>
          <path className="beyond-music-electric-track" d={outline} />
          {compact ? (
            <path className="beyond-music-electric-halo" d={outline}
              strokeDasharray={dasharray} strokeDashoffset={dashoffset}
              opacity={visible ? 1 : 0} />
          ) : null}
          <path ref={chargeRef} className="beyond-music-electric-charge"
            d={outline} strokeDasharray={dasharray} strokeDashoffset={dashoffset}
            opacity={visible ? 1 : 0} />
        </>
      ) : null}
    </svg>
  );
}

export function BeyondMusicPlayer() {
  const [settings, setSettings] = useState<BeyondMusicSettings>(loadSettings);
  const [status, setStatus] = useState<PlaybackStatus>(settings.enabled ? 'starting' : 'paused');
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [demoActive, setDemoActive] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const engineRef = useRef<BeyondMusicEngine | null>(null);
  const settingsRef = useRef(settings);

  settingsRef.current = settings;

  useEffect(() => {
    const engine = new BeyondMusicEngine();
    engineRef.current = engine;
    engine.setVolume(settingsRef.current.volume);
    engine.setMuted(settingsRef.current.muted);

    const requestPlayback = async () => {
      if (!settingsRef.current.enabled) return;
      const state = await engine.start();
      setStatus(state === 'running' ? 'playing' : state === 'closed' ? 'unavailable' : 'waiting');
    };

    void requestPlayback();

    const unlock = () => {
      if (settingsRef.current.enabled && engine.state !== 'running') void requestPlayback();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    const onVisibilityChange = () => {
      if (document.hidden) {
        void engine.pause();
        return;
      }
      if (settingsRef.current.enabled) void requestPlayback();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      engineRef.current = null;
      void engine.destroy();
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(BEYOND_MUSIC_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Private/hardened browsers may deny storage. Playback still works for the current visit.
    }

    const engine = engineRef.current;
    if (!engine) return;
    engine.setVolume(settings.volume);
    engine.setMuted(settings.muted);
  }, [settings]);

  // A short tick updates only while playing; pause retains the last actual
  // audio position and minimising never resets it.
  useEffect(() => {
    const refreshProgress = () => setProgress(engineRef.current?.progress ?? 0);
    refreshProgress();
    if (status !== 'playing') return;
    const intervalId = window.setInterval(refreshProgress, 120);
    return () => window.clearInterval(intervalId);
  }, [status]);

  // Independent visual-only test; doesn't fake a payment, audio playback, or user settings.
  // Because it's local to the mounted player, it survives collapse and expansion.
  useEffect(() => {
    if (!demoActive) return;
    const startedAt = performance.now();
    const refresh = () => {
      const elapsedMs = performance.now() - startedAt;
      setDemoProgress(demoProgressAt(elapsedMs));
      if (elapsedMs >= MUSIC_DEMO_DURATION_MS + MUSIC_DEMO_HOLD_MS) {
        setDemoActive(false);
      }
    };
    refresh();
    const intervalId = window.setInterval(refresh, 60);
    return () => window.clearInterval(intervalId);
  }, [demoActive]);

  const visualProgress = demoActive ? demoProgress : progress;
  const borderActive = demoActive || status === 'playing';

  const togglePlayback = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    if (status === 'playing') {
      const next = { ...settings, enabled: false };
      settingsRef.current = next;
      setSettings(next);
      setStatus('paused');
      await engine.pause();
      setProgress(engine.progress);
      return;
    }

    const next = { ...settings, enabled: true };
    settingsRef.current = next;
    setSettings(next);
    setStatus('starting');
    const state = await engine.start();
    setStatus(state === 'running' ? 'playing' : state === 'closed' ? 'unavailable' : 'waiting');
  };

  const statusLabel = demoActive
    ? 'PRÉVIA VISUAL · SEM ÁUDIO'
    : status === 'playing'
      ? 'TOCANDO'
      : status === 'waiting'
        ? 'TOQUE NA TELA PARA INICIAR'
        : status === 'starting'
          ? 'INICIANDO'
          : status === 'unavailable'
            ? 'ÁUDIO INDISPONÍVEL'
            : 'PAUSADA';

  return (
    <aside
      className="beyond-music-player"
      data-playback={status}
      data-expanded={expanded ? 'true' : 'false'}
      data-demo={demoActive ? 'true' : 'false'}
      aria-label="Música do Pokémon Beyond"
    >
      <button
          type="button"
          className="beyond-music-launcher"
          onClick={() => setExpanded(true)}
          aria-label={`Abrir player de música · ${statusLabel}`}
          aria-expanded={expanded}
          aria-controls="beyond-music-panel"
        >
          <MusicElectricProgressFrame progress={visualProgress} playing={borderActive} compact />
          <img src={ROTOM_SPRITE} alt="" aria-hidden="true" />
          <span className="beyond-music-launcher-note" aria-hidden="true">{demoActive ? 'DEMO' : '♫'}</span>
          <span className="beyond-music-status-dot" aria-hidden="true" />
        </button>
      <section id="beyond-music-panel" className="beyond-music-panel" aria-hidden={!expanded}>
          <MusicElectricProgressFrame progress={visualProgress} playing={borderActive} compact={false} />
          <header className="beyond-music-track">
            <span className="beyond-music-sprite" aria-hidden="true">
              <img src={ROTOM_SPRITE} alt="" />
            </span>
            <div>
              <strong>BEYOND FM</strong>
              <small>TOWN THEME · CC0</small>
              <em>{statusLabel}</em>
            </div>
            <button
              type="button"
              className="beyond-music-collapse"
              onClick={() => setExpanded(false)}
              aria-label="Minimizar player de música"
            >
              −
            </button>
          </header>

          <div className="beyond-music-controls">
            <button
              type="button"
              className="beyond-music-play"
              onClick={() => void togglePlayback()}
              aria-label={status === 'playing' ? 'Pausar música' : 'Tocar música'}
              aria-pressed={status === 'playing'}
            >
              {status === 'playing' ? (
                <span className="beyond-music-pause-icon" aria-hidden="true" />
              ) : (
                <span className="beyond-music-play-icon" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="beyond-music-mute"
              onClick={() => setSettings((current) => ({ ...current, muted: !current.muted }))}
              aria-label={settings.muted ? 'Ativar som' : 'Silenciar música'}
              aria-pressed={settings.muted}
            >
              {settings.muted ? 'MUDO' : 'SOM'}
            </button>
            <label className="beyond-music-volume">
              <span>VOL</span>
              <input
                type="range"
                min="0"
                max="65"
                step="1"
                value={Math.round(settings.volume * 100)}
                onChange={(event) => {
                  const volume = Number(event.currentTarget.value) / 100;
                  setSettings((current) => ({ ...current, volume }));
                }}
                aria-label="Volume da música"
              />
            </label>
          </div>
          <button
            type="button"
            className="beyond-music-demo"
            aria-pressed={demoActive}
            onClick={() => {
              setDemoProgress(0);
              setDemoActive((active) => !active);
            }}
          >
            {demoActive ? 'ENCERRAR PRÉVIA' : 'SIMULAR FAIXA · 16 S'}
          </button>
          <a className="beyond-music-credit" href={BEYOND_MUSIC_SOURCE_PAGE} target="_blank" rel="noopener noreferrer">
            Trilha: cynicmusic · domínio público ↗
          </a>
      </section>
    </aside>
  );
}
