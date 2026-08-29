import { useEffect, useState } from 'react';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import type { JourneyBadgePreview, JourneyProfilePreview } from './journeyProfilePreview';
import {
  KantoBannerTrace,
  KantoLeagueSeal,
  KantoRegistrationMark,
  KantoRouteStamp,
  KantoSecurityRosette,
  KantoTrainerPlaceholder,
} from './kantoLeagueVisualKit';
import './journey-trainer-card-v2.css';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function ExpandIcon({ contracted }: { contracted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {contracted ? (
        <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
      ) : (
        <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" />
      )}
    </svg>
  );
}

function TrainerCardAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  return (
    <div className={`journey-card-v2-avatar${avatarUrl ? ' has-image' : ''}`}>
      {avatarUrl ? <img src={avatarUrl} alt="Foto do treinador" /> : <KantoTrainerPlaceholder />}
      <span className="journey-card-v2-avatar-index" aria-hidden="true">01</span>
    </div>
  );
}

function TrainerCardBadges({ badges }: { badges: JourneyBadgePreview[] }) {
  return (
    <div className="journey-card-v2-badge-row" aria-label="Insígnias de ginásio de Kanto">
      {badges.map((badge, index) => (
        <div
          className={`journey-card-v2-badge${badge.earned ? ' is-earned' : ''}`}
          key={badge.key}
          role="img"
          aria-label={`${badge.name}: ${badge.earned ? 'conquistada' : 'não conquistada'}`}
          title={badge.name}
        >
          <span className={`journey-card-v2-badge-shape badge-${badge.key}`} aria-hidden="true" />
          <small aria-hidden="true">{String(index + 1).padStart(2, '0')}</small>
        </div>
      ))}
    </div>
  );
}

export function ShareTrainerCardV2({
  profile,
  coverUrl,
  avatarUrl,
  onClose,
}: {
  profile: JourneyProfilePreview;
  coverUrl: string | null;
  avatarUrl: string | null;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="journey-card-v2-backdrop">
      <section className="journey-card-v2-dialog" role="dialog" aria-modal="true" aria-labelledby="journey-card-v2-title">
        <div className="journey-card-v2-toolbar">
          <div className="journey-card-v2-toolbar-copy">
            <span>ARTEFATO DE COMPARTILHAMENTO</span>
            <strong id="journey-card-v2-title">Trainer Card · Kanto</strong>
          </div>
          <div className="journey-card-v2-toolbar-actions">
            <button type="button" aria-pressed={zoomed} onClick={() => setZoomed((value) => !value)}>
              <ExpandIcon contracted={zoomed} />
              <span>{zoomed ? 'AJUSTAR' : 'AMPLIAR'}</span>
            </button>
            <button className="journey-card-v2-close" type="button" onClick={onClose} aria-label="Fechar Trainer Card">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className={`journey-card-v2-viewport${zoomed ? ' is-zoomed' : ''}`}>
          <article className="journey-card-v2" aria-label={`Trainer Card de ${profile.trainerName}`}>
            <div className="journey-card-v2-paper-grid" aria-hidden="true" />
            <div className="journey-card-v2-rail" aria-hidden="true">
              <KantoRegistrationMark />
              <span>KNT</span>
            </div>

            <header className="journey-card-v2-header">
              <div className="journey-card-v2-brand">
                <KantoLeagueSeal />
                <div>
                  <span>{profile.originRegion.toUpperCase()} LEAGUE</span>
                  <strong>TRAINER LICENSE</strong>
                </div>
              </div>
              <div className="journey-card-v2-registration">
                <small>REGISTRATION</small>
                <strong>{profile.trainerId}</strong>
              </div>
              <KantoSecurityRosette className="journey-card-v2-security-top" />
            </header>

            <div className="journey-card-v2-watermark" aria-hidden="true">
              <KantoLeagueSeal />
            </div>

            <div className={`journey-card-v2-banner${coverUrl ? ' has-image' : ''}`} aria-hidden="true">
              {coverUrl ? <img src={coverUrl} alt="" /> : null}
              <KantoBannerTrace />
              <span>KANTO ROUTE NETWORK · REGISTERED TRAINER</span>
            </div>

            <section className="journey-card-v2-identity">
              <TrainerCardAvatar avatarUrl={avatarUrl} />
              <div className="journey-card-v2-identity-copy">
                <span className="journey-card-v2-kicker">LICENSE HOLDER</span>
                <h2>{profile.trainerName}</h2>
                <p>{profile.trainerTitle}</p>
                <div className="journey-card-v2-meta">
                  <div>
                    <span>REGIÃO</span>
                    <strong>{profile.originRegion}</strong>
                  </div>
                  <div>
                    <span>LOCAL ATUAL</span>
                    <strong>{profile.currentLocation}</strong>
                  </div>
                </div>
              </div>
            </section>

            {profile.leadPokemon ? (
              <aside className="journey-card-v2-partner" aria-label={`Parceiro registrado ${profile.leadPokemon.nickname}`}>
                <div className="journey-card-v2-partner-head">
                  <span>PARTNER 01</span>
                  <small>ACTIVE</small>
                </div>
                <div className="journey-card-v2-partner-art">
                  <PokemonAssetImage
                    dex={profile.leadPokemon.dex}
                    assetRole="home-artwork"
                    alt={profile.leadPokemon.nickname}
                    loading="eager"
                    decoding="async"
                    fallbackLabel="?"
                  />
                </div>
                <div className="journey-card-v2-partner-copy">
                  <strong>{profile.leadPokemon.nickname}</strong>
                  <span>Nv. {profile.leadPokemon.level}</span>
                </div>
              </aside>
            ) : null}

            <section className="journey-card-v2-badges">
              <div className="journey-card-v2-badges-head">
                <span>KANTO GYM CIRCUIT</span>
                <small>08 LICENSE SLOTS</small>
              </div>
              <TrainerCardBadges badges={profile.badges} />
            </section>

            <footer className="journey-card-v2-footer">
              <div className="journey-card-v2-route">
                <KantoRouteStamp />
                <span>{profile.currentLocation.toUpperCase()}</span>
              </div>
              <div className="journey-card-v2-auth">
                <KantoSecurityRosette />
                <div>
                  <span>LEAGUE AUTH</span>
                  <strong>VALID · KNT</strong>
                </div>
              </div>
            </footer>
          </article>
        </div>

        <p className="journey-card-v2-hint">
          A composição é fixa como uma peça gráfica. Use <strong>Ampliar</strong> no celular para inspecionar detalhes sem deformar o card.
        </p>
      </section>
    </div>
  );
}
