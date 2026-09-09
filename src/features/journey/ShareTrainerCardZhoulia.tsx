import { useEffect, useState } from 'react';
import type { JourneyProfilePreview } from './journeyProfilePreview';
import {
  emitZhouliaTrainerCard,
  type EmittedTrainerCard,
} from './trainerCardEmissionRuntime';
import './journey-trainer-card-zhoulia.css';

export function ShareTrainerCardZhoulia({
  profile,
  avatarUrl,
  onClose,
  onEmitted,
}: {
  profile: JourneyProfilePreview;
  avatarUrl: string | null;
  onClose: () => void;
  onEmitted?: () => void;
}) {
  const [result, setResult] = useState<EmittedTrainerCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let generatedUrl: string | null = null;

    setResult(null);
    setError(null);

    if (!avatarUrl) {
      setError('Adicione uma foto de treinador antes de emitir o card.');
      return () => undefined;
    }

    void emitZhouliaTrainerCard({ profile, avatarUrl })
      .then((next) => {
        generatedUrl = next.pngUrl;
        if (cancelled) {
          URL.revokeObjectURL(next.pngUrl);
          return;
        }
        setResult(next);
        onEmitted?.();
      })
      .catch((cause) => {
        console.error('Zhoulia Trainer Card emission failed', cause);
        if (!cancelled) setError('Não foi possível emitir o Trainer Card. Tente novamente.');
      });

    return () => {
      cancelled = true;
      if (generatedUrl) URL.revokeObjectURL(generatedUrl);
    };
  }, [avatarUrl, onEmitted, profile, retryKey]);

  const download = () => {
    if (!result) return;
    const anchor = document.createElement('a');
    anchor.href = result.pngUrl;
    anchor.download = result.downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div
      className="journey-card-v2-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="journey-zhoulia-card-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Trainer Card de ${profile.originRegion}`}
      >
        <button className="journey-zhoulia-card-close" type="button" onClick={onClose} aria-label="Fechar Trainer Card">
          ×
        </button>

        <div className="journey-zhoulia-card-stage" aria-live="polite">
          {!result && !error ? (
            <div className="journey-zhoulia-card-status">
              <strong>REGISTRO VALIDADO — LIGA DE ZHOULIA</strong>
              <span>Emitindo Trainer Card...</span>
            </div>
          ) : null}

          {error ? (
            <div className="journey-zhoulia-card-status is-error" role="alert">
              <strong>EMISSÃO INTERROMPIDA</strong>
              <span>{error}</span>
              <button type="button" onClick={() => setRetryKey((value) => value + 1)}>TENTAR NOVAMENTE</button>
            </div>
          ) : null}

          {result ? (
            <img
              className="journey-zhoulia-card-png"
              src={result.pngUrl}
              alt={`Trainer Card de ${profile.trainerName}`}
              width="1448"
              height="1086"
              draggable={false}
            />
          ) : null}
        </div>

        {result ? (
          <div className="journey-zhoulia-card-actions">
            <button className="journey-zhoulia-card-download" type="button" onClick={download}>BAIXAR PNG</button>
            <button className="journey-zhoulia-card-dismiss" type="button" onClick={onClose}>FECHAR</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
