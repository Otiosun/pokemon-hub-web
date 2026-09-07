import { useEffect, useState } from 'react';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import type { JourneyProfilePreview } from './journeyProfilePreview';
import { resolveTrainerPhotoFocalPoint, type TrainerPhotoFocalPoint } from './trainerCardPhotoFocal';
import { ZhouliaEPrimeMark } from './zhouliaLeagueVisualKit';
import './journey-trainer-card-zhoulia.css';

const DEFAULT_FOCAL: TrainerPhotoFocalPoint = {
  x: 0.5,
  y: 0.5,
  source: 'orientation-fallback',
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function TrainerPhoto({ src }: { src: string | null }) {
  const [focal, setFocal] = useState<TrainerPhotoFocalPoint>(DEFAULT_FOCAL);

  useEffect(() => {
    let cancelled = false;
    setFocal(DEFAULT_FOCAL);
    if (!src) return () => {
      cancelled = true;
    };

    resolveTrainerPhotoFocalPoint(src)
      .then((next) => {
        if (!cancelled) setFocal(next);
      })
      .catch(() => {
        if (!cancelled) setFocal(DEFAULT_FOCAL);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src) return null;

  return (
    <div className="journey-zhoulia-card-photo" data-focal-source={focal.source}>
      <img
        src={src}
        alt="Foto do treinador"
        style={{ objectPosition: `${focal.x * 100}% ${focal.y * 100}%` }}
      />
    </div>
  );
}

export function ShareTrainerCardZhoulia({
  profile,
  avatarUrl,
  onClose,
}: {
  profile: JourneyProfilePreview;
  avatarUrl: string | null;
  onClose: () => void;
}) {
  const rows = [
    ['NOME', profile.trainerName],
    ['TÍTULO', profile.trainerTitle],
    ['LOCAL', profile.currentLocation],
    ['PARCEIRO', profile.leadPokemon?.nickname ?? '—'],
    ['ID', profile.trainerId],
  ] as const;

  return (
    <div className="journey-card-v2-backdrop">
      <section
        className="journey-zhoulia-card-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Trainer Card de ${profile.originRegion}`}
      >
        <button className="journey-zhoulia-card-close" type="button" onClick={onClose} aria-label="Fechar Trainer Card">
          <CloseIcon />
        </button>

        <article className="journey-zhoulia-card" aria-label={`Trainer Card de ${profile.trainerName}`}>
          <img
            className="journey-zhoulia-card-base"
            src="/assets/journey/zhoulia-trainer-card-ai-base-v1.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
          />

          <div className="journey-zhoulia-card-title">TRAINER CARD</div>

          <section className="journey-zhoulia-card-region" aria-label={`Liga de ${profile.originRegion}`}>
            <strong>{profile.originRegion.toUpperCase()}</strong>
            <span aria-hidden="true" />
            <ZhouliaEPrimeMark className="journey-zhoulia-card-region-mark" />
          </section>

          <div className="journey-zhoulia-card-fields">
            {rows.map(([label, value], index) => (
              <div className="journey-zhoulia-card-field" key={label} data-row={index + 1}>
                <span>{label}</span>
                <strong title={value}>{value}</strong>
              </div>
            ))}
          </div>

          <TrainerPhoto src={avatarUrl} />

          {profile.leadPokemon ? (
            <section className="journey-zhoulia-card-partner" aria-label={`Parceiro ${profile.leadPokemon.nickname}`}>
              <PokemonAssetImage
                dex={profile.leadPokemon.dex}
                assetRole="home-artwork"
                alt={profile.leadPokemon.nickname}
                loading="eager"
                decoding="async"
                fallbackLabel="?"
              />
            </section>
          ) : null}

          <section className="journey-zhoulia-card-badges" aria-label={`Insígnias de ${profile.originRegion}`}>
            {profile.badges.slice(0, 8).map((badge) => (
              <span
                className={`journey-zhoulia-card-badge${badge.earned ? ' is-earned' : ''}`}
                key={badge.key}
                role="img"
                aria-label={`${badge.name}: ${badge.earned ? 'conquistada' : 'não conquistada'}`}
                title={badge.name}
              >
                {badge.earned && badge.assetUrl ? <img src={badge.assetUrl} alt="" aria-hidden="true" /> : <i aria-hidden="true" />}
              </span>
            ))}
          </section>
        </article>
      </section>
    </div>
  );
}
