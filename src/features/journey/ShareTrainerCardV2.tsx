import { useEffect } from 'react';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import type { JourneyBadgePreview, JourneyProfilePreview } from './journeyProfilePreview';
import { KantoLeagueSeal, KantoTrainerPlaceholder } from './kantoLeagueVisualKit';
import './journey-trainer-card-v2.css';
import './journey-trainer-card-v2-reference-fixes.css';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.15" />
    </svg>
  );
}

function TrainerAvatar({ avatarUrl }: { avatarUrl: string | null }) {
  return (
    <div className={`journey-card-v2-avatar${avatarUrl ? ' has-image' : ''}`}>
      {avatarUrl ? <img src={avatarUrl} alt="Foto do treinador" /> : <KantoTrainerPlaceholder />}
      <span className="journey-card-v2-avatar-node node-left" aria-hidden="true" />
      <span className="journey-card-v2-avatar-node node-right" aria-hidden="true" />
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
          {badge.earned ? <i className={`badge-${badge.key}`} aria-hidden="true" /> : null}
        </span>
      ))}
    </div>
  );
}

function FlowGeometry() {
  return (
    <>
      <svg className="journey-card-v2-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="journey-card-flow-cut" clipPathUnits="objectBoundingBox">
            <path d="M .455 .205 C .57 .115 .73 .125 1 .165 L 1 .805 C .855 .775 .74 .72 .642 .625 C .555 .54 .475 .46 .405 .398 C .355 .352 .372 .274 .455 .205 Z" />
          </clipPath>
        </defs>
      </svg>

      <svg
        className="journey-card-v2-flow-lines"
        viewBox="0 0 1680 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M120 240C330 160 545 160 760 228C903 273 1018 264 1160 197" />
        <path d="M92 278C320 194 552 193 782 263C919 305 1037 297 1187 226" />
        <path d="M70 318C307 232 552 227 799 299C939 340 1068 329 1215 255" />
        <path d="M118 720C346 650 566 656 754 728C915 790 1095 795 1284 731" />
        <path d="M152 755C375 690 579 700 759 767C927 830 1104 829 1280 772" />
        <path d="M1032 74C1188 30 1396 40 1570 112" />
        <path d="M1090 104C1240 66 1410 72 1560 132" />
        <path
          className="journey-card-v2-flow-boundary"
          d="M764 205C958 115 1226 125 1680 165M1680 805C1436 775 1243 720 1079 625C933 540 798 460 680 398C596 352 625 274 764 205"
        />
      </svg>
    </>
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

  const region = profile.originRegion.toUpperCase();

  return (
    <div className="journey-card-v2-backdrop">
      <section
        className="journey-card-v2-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Trainer Card de ${profile.originRegion}`}
      >
        <button className="journey-card-v2-close" type="button" onClick={onClose} aria-label="Fechar Trainer Card">
          <CloseIcon />
        </button>

        <article className={`journey-card-v2${coverUrl ? ' has-cover' : ''}`} aria-label={`Trainer Card de ${profile.trainerName}`}>
          <FlowGeometry />

          <div className="journey-card-v2-paper-grain" aria-hidden="true" />

          <div className="journey-card-v2-cover" aria-hidden="true">
            {coverUrl ? <img src={coverUrl} alt="" /> : <span className="journey-card-v2-cover-fallback" />}
          </div>
          <div className="journey-card-v2-cover-shade" aria-hidden="true" />

          <header className="journey-card-v2-header">
            <div className="journey-card-v2-brand">
              <span className="journey-card-v2-brand-mark" aria-hidden="true"><KantoLeagueSeal /></span>
              <span className="journey-card-v2-brand-copy">
                <small>LIGA POKÉMON DE</small>
                <strong>{region}</strong>
              </span>
            </div>

            <div className="journey-card-v2-id">
              <span>TRAINER ID</span>
              <strong>{profile.trainerId}</strong>
              <i aria-hidden="true" />
            </div>
          </header>

          <section className="journey-card-v2-identity">
            <TrainerAvatar avatarUrl={avatarUrl} />
            <div className="journey-card-v2-identity-copy">
              <span className="journey-card-v2-kicker">TREINADOR</span>
              <h2>{profile.trainerName}</h2>
              <span className="journey-card-v2-name-rule" aria-hidden="true" />
              <p>{profile.trainerTitle}</p>
              <div className="journey-card-v2-location">
                <LocationIcon />
                <span>
                  <strong>{profile.currentLocation}</strong>
                  <small>{profile.originRegion}</small>
                </span>
              </div>
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
            </aside>
          ) : null}

          <section className="journey-card-v2-badges" aria-label={`Insígnias de ${profile.originRegion}`}>
            <span className="journey-card-v2-badge-label">INSÍGNIAS</span>
            <span className="journey-card-v2-badge-rule" aria-hidden="true" />
            <BadgeStrip badges={profile.badges} />
          </section>
        </article>
      </section>
    </div>
  );
}
