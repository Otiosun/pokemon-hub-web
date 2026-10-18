import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BeyondFmPlaylistEngine } from './beyondFmPlaylistEngine';
import {
  BEYOND_FM_TRACKS,
  importFmFiles,
  restoreFmLibrary,
  saveFmLibrary,
  type BeyondFmTrackId,
} from './beyondFmLibrary';
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

function clockText(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

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
  const [library, setLibrary] = useState<'loading' | 'missing' | 'importing' | 'ready'>('loading');
  const [storageWarning, setStorageWarning] = useState(false);
  const [importError, setImportError] = useState('');
  const [activeId, setActiveId] = useState<BeyondFmTrackId | null>(null);
  const [seconds, setSeconds] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<BeyondFmPlaylistEngine | null>(null);
  const settingsRef = useRef(settings);

  settingsRef.current = settings;

  useEffect(() => {
    let mounted = true;
    const engine = new BeyondFmPlaylistEngine(
      (id) => { if (mounted) { setActiveId(id); setProgress(0); setSeconds(0); } },
      (state) => { if (mounted) setStatus(state === 'running' ? 'playing' : state === 'closed' ? 'unavailable' : 'waiting'); },
    );
    engineRef.current = engine;
    engine.setVolume(settingsRef.current.volume);
    engine.setMuted(settingsRef.current.muted);

    const requestPlayback = async () => {
      if (!settingsRef.current.enabled || !engine.hasTracks) return;
      const state = await engine.start();
      if (mounted) setStatus(state === 'running' ? 'playing' : state === 'closed' ? 'unavailable' : 'waiting');
    };

    void restoreFmLibrary().then((saved) => {
      if (!mounted) return;
      if (saved.length === 4) {
        engine.install(saved);
        setLibrary('ready');
        void requestPlayback();
      } else setLibrary('missing');
    }).catch(() => {
      if (mounted) setLibrary('missing');
    });

    const unlock = () => {
      if (settingsRef.current.enabled && engine.hasTracks && engine.state !== 'running') {
        void requestPlayback();
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    const onVisibilityChange = () => {
      if (document.hidden) { engine.pause(); return; }
      if (settingsRef.current.enabled) void requestPlayback();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      engineRef.current = null;
      engine.destroy();
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
    const refreshProgress = () => {
      setProgress(engineRef.current?.progress ?? 0);
      setSeconds(engineRef.current?.currentTime ?? 0);
    };
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
      engine.pause();
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

  const selectedTrack = BEYOND_FM_TRACKS.find((track) => track.id === activeId);
  const available = library === 'ready';
  const statusLabel = demoActive
    ? 'PRÉVIA VISUAL'
    : library === 'loading'
      ? 'CARREGANDO BIBLIOTECA'
      : !available
        ? 'AGUARDANDO AS 4 FAIXAS'
        : status === 'playing'
          ? 'TOCANDO · ALEATÓRIO'
          : status === 'waiting'
            ? 'TOQUE PARA LIBERAR O SOM'
            : status === 'starting'
              ? 'INICIANDO'
              : status === 'unavailable'
                ? 'FALHA NA REPRODUÇÃO'
                : 'PAUSADO';

  const onImport = async (selected: File[]) => {
    if (!selected.length) return;
    setLibrary('importing');
    setImportError('');
    try {
      const tracks = await importFmFiles(selected);
      let persisted = true;
      try { await saveFmLibrary(tracks); } catch { persisted = false; }
      setStorageWarning(!persisted);
      const engine = engineRef.current;
      if (!engine) return;
      engine.install(tracks);
      setActiveId(null);
      setProgress(0);
      setSeconds(0);
      setDemoActive(false);
      setLibrary('ready');
      const next = { ...settingsRef.current, enabled: true };
      settingsRef.current = next;
      setSettings(next);
      const playback = await engine.start();
      setStatus(playback === 'running' ? 'playing' : playback === 'closed' ? 'unavailable' : 'waiting');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Não foi possível importar as faixas.');
      setLibrary(engineRef.current?.hasTracks ? 'ready' : 'missing');
    }
  };

  const switchTrack = async (direction: 'next' | 'previous') => {
    const engine = engineRef.current;
    if (!engine || !engine.hasTracks) return;
    const next = { ...settingsRef.current, enabled: true };
    settingsRef.current = next;
    setSettings(next);
    const state = direction === 'next' ? await engine.next() : await engine.previous();
    setStatus(state === 'running' ? 'playing' : state === 'closed' ? 'unavailable' : 'waiting');
    setProgress(engine.progress);
  };

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
              <small title={selectedTrack?.title}>{selectedTrack?.title ?? '4 TRACKS · SHUFFLE'}</small>
              <em title={selectedTrack?.artist}>{selectedTrack ? `${selectedTrack.artist} · ${statusLabel}` : statusLabel}</em>
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
            <button type="button" className="beyond-music-skip" disabled={!available}
              onClick={() => void switchTrack('previous')} aria-label="Música anterior">‹</button>
            <button type="button" className="beyond-music-play" disabled={!available}
              onClick={() => void togglePlayback()}
              aria-label={status === 'playing' ? 'Pausar música' : 'Tocar música'}
              aria-pressed={status === 'playing'}>
              {status === 'playing'
                ? <span className="beyond-music-pause-icon" aria-hidden="true" />
                : <span className="beyond-music-play-icon" aria-hidden="true" />}
            </button>
            <button type="button" className="beyond-music-skip" disabled={!available}
              onClick={() => void switchTrack('next')} aria-label="Próxima música">›</button>
            <button type="button" className="beyond-music-mute"
              onClick={() => setSettings((current) => ({ ...current, muted: !current.muted }))}
              aria-label={settings.muted ? 'Ativar som' : 'Silenciar música'} aria-pressed={settings.muted}>
              {settings.muted ? 'MUDO' : 'SOM'}
            </button>
            <label className="beyond-music-volume">
              <span>VOL</span>
              <input type="range" min="0" max="65" step="1"
                value={Math.round(settings.volume * 100)}
                onChange={(event) => setSettings((current) => ({
                  ...current, volume: Number(event.currentTarget.value) / 100,
                }))} aria-label="Volume da música" />
            </label>
          </div>

          <div className="beyond-fm-timeline">
            <span>{clockText(seconds)}</span>
            <div className="beyond-fm-timeline-track">
              <div style={{ width: `${Math.round(progress * 1000) / 10}%` }} />
            </div>
            <span>{clockText(engineRef.current?.duration || selectedTrack?.duration || 0)}</span>
          </div>
          <div className="beyond-fm-playlist-heading">
            <strong>ROTAÇÃO ALEATÓRIA</strong>
            <span>{available ? '4 FAIXAS · SEM REPETIR ATÉ COMPLETAR' : 'ARQUIVOS LOCAIS'}</span>
          </div>
          <div className="beyond-fm-playlist">
            {BEYOND_FM_TRACKS.map((track, index) => (
              <button type="button" key={track.id}
                className={`beyond-fm-track-row${activeId === track.id && available ? ' is-current' : ''}`}
                disabled={!available} aria-current={activeId === track.id ? 'true' : undefined}
                onClick={() => { 
                  const engine = engineRef.current;
                  if (!engine) return;
                  setSettings((current) => ({ ...current, enabled: true }));
                  void engine.select(track.id).then((state) => 
                    setStatus(state === 'running' ? 'playing' : state === 'closed' ? 'unavailable' : 'waiting'));
                }}>
                <span className="beyond-fm-track-number">{activeId === track.id && status === 'playing' ? '♫' : String(index + 1).padStart(2, '0')}</span>
                <span className="beyond-fm-track-details">
                  <strong>{track.title}</strong><small>{track.artist}</small>
                </span>
                <span className="beyond-fm-track-duration">{clockText(track.duration)}</span>
              </button>
            ))}
          </div>

          <input ref={inputRef} className="beyond-fm-hidden-input" type="file"
            accept=".zip,.m4a,audio/mp4,audio/x-m4a" multiple
            aria-label="Selecionar quatro faixas M4A ou pacote ZIP"
            onChange={(event) => {
              const files = [...(event.currentTarget.files ?? [])];
              event.currentTarget.value = '';
              void onImport(files);
            }} />
          <button type="button" className="beyond-fm-import"
            disabled={library === 'loading' || library === 'importing'}
            onClick={() => inputRef.current?.click()}>
            {library === 'importing' ? 'IMPORTANDO…' : available ? 'SUBSTITUIR BIBLIOTECA' : 'ADICIONAR 4 FAIXAS · ZIP OU M4A'}
          </button>
          {!available ? (
            <p className="beyond-fm-import-hint">
              Importe o pacote Beyond FM uma vez. As músicas ficam no seu dispositivo,
              sem serem publicadas no servidor.
            </p>
          ) : null}
          {storageWarning ? <p className="beyond-fm-import-hint is-error">
            O navegador bloqueou o armazenamento permanente. As músicas funcionam nesta visita, mas precisarão ser importadas novamente.
          </p> : null}
          {importError ? <p className="beyond-fm-import-hint is-error" role="alert">{importError}</p> : null}
          {!available ? (
            <button type="button" className="beyond-music-demo" aria-pressed={demoActive}
              onClick={() => { setDemoProgress(0); setDemoActive((active) => !active); }}>
              {demoActive ? 'ENCERRAR PRÉVIA' : 'SIMULAR FAIXA · 16 S'}
            </button>
          ) : null}
          <span className="beyond-music-credit">
            {available ? 'ÁUDIO LOCAL · CONTROLE POR ROTOM' : 'BIBLIOTECA PRIVADA · POKÉMON BEYOND'}
          </span>
      </section>
    </aside>
  );
}
