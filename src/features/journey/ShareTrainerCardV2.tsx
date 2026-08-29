import { useEffect } from 'react';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import type { JourneyBadgePreview, JourneyProfilePreview } from './journeyProfilePreview';
import { KantoLeagueSeal, KantoTrainerPlaceholder } from './kantoLeagueVisualKit';
import './journey-trainer-card-v2.css';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function TrainerAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  return (
    <div className={`journey-card-v2-avatar${avatarUrl ? ' has-image' : ''}`}>
      {avatarUrl ? <img src={avatarUrl} alt="Foto do treinador" /> : <KantoTrainerPlaceholder />}
    </div>
  );
}

function BadgeStrip({ badges }: { badges: JourneyBadgePreview[] }) {
  return (
    <div className="journey-card-v2-badge-row">
      {badges.map((badge) => (
        <span
          className={`journey-card-v2-badge${badge.earned ? ' is-earned' : ''}`}
          key={badge.key}
          role="img"
          aria-label={`${badge.name}: ${badge.earned ? 'conquistada' : 'não conquistada'}`}
          title={badge.name}
        >
          <i className={`badge-${badge.key}`} aria-hidden="true" />
        </span>
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
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="journey-card-v2-backdrop">
      <section className="journey-card-v2-dialog" role="dialog" aria-modal="true" aria-label="Trainer Card de Kanto">
        <button className="journey-card-v2-close" type="button" onClick={onClose} aria-label="Fechar Trainer Card">
          <CloseIcon />
        </button>

        <article className={`journey-card-v2${coverUrl ? ' has-cover' : ''}`} aria-label={`Trainer Card de ${profile.trainerName}`}>
          <div className="journey-card-v2-cover" aria-hidden="true">
            {coverUrl ? <img src={coverUrl} alt="" /> : null}
          </div>
          <div className="journey-card-v2-cover-shade" aria-hidden="true" />
          <div className="journey-card-v2-kanto-shape" aria-hidden="true" />

          <header className="journey-card-v2-header">
            <div className="journey-card-v2-brand">
              <KantoLeagueSeal />
              <span>KANTO LEAGUE</span>
            </div>
            <strong>{profile.trainerId}</strong>
          </header>

          <div className="journey-card-v2-seal" aria-hidden="true">
            <KantoLeagueSeal />
          </div>

          <section className="journey-card-v2-identity">
            <TrainerAvatar avatarUrl={avatarUrl} />
            <div className="journey-card-v2-identity-copy">
              <h2>{profile.trainerName}</h2>
              <p>{profile.trainerTitle}</p>
              <span>{profile.originRegion} · {profile.currentLocation}</span>
            </div>
          </section>

          {profile.leadPokemon ? (
            <aside className="journey-card-v2-partner" aria-label={`Parceiro ${profile.leadPokemon.nickname}`}>
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
              <div className="journey-card-v2-partner-name">
                <strong>{profile.leadPokemon.nickname}</strong>
                <span>Nv. {profile.leadPokemon.level}</span>
              </div>
            </aside>
          ) : null}

          <section className="journey-card-v2-badges" aria-label="Insígnias de Kanto">
            <span className="journey-card-v2-badge-label">KANTO GYM</span>
            <BadgeStrip badges={profile.badges} />
          </section>
        </article>
      </section>
    </div>
  );
}
