import { useEffect, useRef, useState } from 'react';
import { BeyondMusicEngine } from './beyondMusicEngine';
import {
  BEYOND_MUSIC_STORAGE_KEY,
  DEFAULT_BEYOND_MUSIC_SETTINGS,
  type BeyondMusicSettings,
  sanitizeBeyondMusicSettings,
} from './beyondMusicSettings';
import './beyond-music-player.css';

type PlaybackStatus = 'starting' | 'playing' | 'waiting' | 'paused';

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

export function BeyondMusicPlayer() {
  const [settings, setSettings] = useState<BeyondMusicSettings>(loadSettings);
  const [status, setStatus] = useState<PlaybackStatus>(settings.enabled ? 'starting' : 'paused');
  const [expanded, setExpanded] = useState(false);
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
      setStatus(state === 'running' ? 'playing' : 'waiting');
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

  const togglePlayback = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    if (settings.enabled) {
      const next = { ...settings, enabled: false };
      settingsRef.current = next;
      setSettings(next);
      setStatus('paused');
      await engine.pause();
      return;
    }

    const next = { ...settings, enabled: true };
    settingsRef.current = next;
    setSettings(next);
    setStatus('starting');
    const state = await engine.start();
    setStatus(state === 'running' ? 'playing' : 'waiting');
  };

  const statusLabel =
    status === 'playing'
      ? 'TOCANDO'
      : status === 'waiting'
        ? 'TOQUE NA TELA PARA INICIAR'
        : status === 'starting'
          ? 'INICIANDO'
          : 'PAUSADA';

  return (
    <aside
      className="beyond-music-player"
      data-playback={status}
      data-expanded={expanded ? 'true' : 'false'}
      aria-label="Música do Pokémon Beyond"
    >
      {!expanded ? (
        <button
          type="button"
          className="beyond-music-launcher"
          onClick={() => setExpanded(true)}
          aria-label={`Abrir player de música · ${statusLabel}`}
          aria-expanded="false"
          aria-controls="beyond-music-panel"
        >
          <img src={ROTOM_SPRITE} alt="" aria-hidden="true" />
          <span className="beyond-music-launcher-note" aria-hidden="true">♫</span>
          <span className="beyond-music-status-dot" aria-hidden="true" />
        </button>
      ) : (
        <section id="beyond-music-panel" className="beyond-music-panel">
          <header className="beyond-music-track">
            <span className="beyond-music-sprite" aria-hidden="true">
              <img src={ROTOM_SPRITE} alt="" />
            </span>
            <div>
              <strong>BEYOND FM</strong>
              <small>ROTA DISTANTE</small>
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
              aria-label={settings.enabled ? 'Pausar música' : 'Tocar música'}
              aria-pressed={settings.enabled}
            >
              {settings.enabled ? 'Ⅱ' : '▶'}
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
        </section>
      )}
    </aside>
  );
}
