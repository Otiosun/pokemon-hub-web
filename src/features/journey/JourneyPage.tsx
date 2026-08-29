import { useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import {
  getJourneyProfilePreview,
  type JourneyBadgePreview,
  type JourneyProfilePreview,
} from './journeyProfilePreview';
import './journey-page.css';
import './journey-page-review-fixes.css';

const MAX_PROFILE_IMAGE_BYTES = 8 * 1024 * 1024;
type ProfileImageSlot = 'cover' | 'avatar';

// Cosmetic preview only: keep one object URL per slot while this SPA document is alive.
// Replacing a slot revokes the previous URL; a full reload naturally clears the preview.
const profileImagePreviewUrls: Record<ProfileImageSlot, string | null> = {
  cover: null,
  avatar: null,
};

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19h3.6L19 8.6 15.4 5 5 15.4V19Zm11.4-15.4L20 7.2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 5 7 7-7 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="8" cy="11" r="2.2" />
      <path d="M5.5 16c.5-1.8 1.4-2.7 2.5-2.7s2 .9 2.5 2.7M13 9h5M13 12h5M13 15h3" />
    </svg>
  );
}

function useImagePreview(slot: ProfileImageSlot) {
  const [url, setUrl] = useState<string | null>(() => profileImagePreviewUrls[slot]);
  const [error, setError] = useState<string | null>(null);

  const select = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Escolha um arquivo de imagem.');
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setError('Use uma imagem de até 8 MB.');
      return;
    }

    const previousUrl = profileImagePreviewUrls[slot];
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const nextUrl = URL.createObjectURL(file);
    profileImagePreviewUrls[slot] = nextUrl;
    setUrl(nextUrl);
    setError(null);
  };

  return { url, error, select };
}

function displayValue(value: string | number | null, fallback: string) {
  if (value === null || value === '') return fallback;
  return String(value);
}

function TrainerAvatar({ avatarUrl, compact = false }: { avatarUrl: string | null; compact?: boolean }) {
  return (
    <div
      className={`journey-avatar${avatarUrl ? ' has-image' : ''}${compact ? ' is-compact' : ''}`}
      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
      aria-label={avatarUrl ? 'Foto de perfil personalizada' : 'Perfil sem foto personalizada'}
      role="img"
    >
      {avatarUrl ? null : (
        <span className="journey-avatar-ball" aria-hidden="true">
          <i />
        </span>
      )}
    </div>
  );
}

function BadgeStrip({ badges, compact = false }: { badges: JourneyBadgePreview[]; compact?: boolean }) {
  return (
    <div className={`journey-badge-strip${compact ? ' is-compact' : ''}`}>
      {badges.map((badge, index) => (
        <div
          className={`journey-badge-slot${badge.earned ? ' is-earned' : ''}`}
          key={badge.key}
          role="img"
          aria-label={`${badge.name}: ${badge.earned ? 'conquistada' : 'não conquistada'}`}
          title={badge.name}
        >
          <span className={`journey-badge-shape badge-${badge.key}`} aria-hidden="true" />
          <span className="journey-badge-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        </div>
      ))}
    </div>
  );
}

function ShareTrainerCard({
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
  return (
    <div className="journey-share-backdrop">
      <section className="journey-share-dialog" role="dialog" aria-modal="true" aria-labelledby="journey-share-title">
        <div className="journey-share-toolbar">
          <div>
            <span>PRÉVIA HORIZONTAL</span>
            <strong id="journey-share-title">Trainer Card</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar Trainer Card">
            <CloseIcon />
          </button>
        </div>

        <div className="journey-share-card">
          <div className="journey-share-head">
            <div>
              <span>{profile.originRegion.toUpperCase()} LEAGUE</span>
              <small>TRAINER REGISTRATION LICENSE</small>
            </div>
            <strong>{profile.trainerId}</strong>
          </div>

          <div className={`journey-share-cover${coverUrl ? ' has-image' : ''}`}>
            {coverUrl ? <img src={coverUrl} alt="" /> : null}
            <span className="journey-share-cover-mark" aria-hidden="true" />
          </div>

          <div className="journey-share-identity">
            <TrainerAvatar avatarUrl={avatarUrl} compact />
            <div className="journey-share-name">
              <strong>{profile.trainerName}</strong>
              <span>{profile.trainerTitle}</span>
            </div>
            {profile.leadPokemon ? (
              <div className="journey-share-partner">
                <span>PARCEIRO</span>
                <PokemonAssetImage
                  dex={profile.leadPokemon.dex}
                  assetRole="home-artwork"
                  alt=""
                  loading="eager"
                  decoding="async"
                  fallbackLabel="?"
                />
                <strong>{profile.leadPokemon.nickname}</strong>
                <small>Nv. {profile.leadPokemon.level}</small>
              </div>
            ) : null}
          </div>

          <div className="journey-share-meta">
            <div><span>REGIÃO</span><strong>{profile.originRegion}</strong></div>
            <div><span>LOCALIZAÇÃO</span><strong>{profile.currentLocation}</strong></div>
          </div>

          <BadgeStrip badges={profile.badges} compact />
          <div className="journey-share-footer">ISSUED BY {profile.originRegion.toUpperCase()} LEAGUE</div>
        </div>
      </section>
    </div>
  );
}

export function JourneyPage() {
  const profile = getJourneyProfilePreview();
  const cover = useImagePreview('cover');
  const avatar = useImagePreview('avatar');
  const [editing, setEditing] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const imageError = cover.error ?? avatar.error;

  return (
    <main className="journey-page">
      <HubModuleHeader module="journey" metaLabel="REGIÃO" metaValue={profile.originRegion.toUpperCase()} />

      <div className="journey-profile-shell">
        <section className="journey-license" aria-labelledby="journey-trainer-name">
          <div className="journey-license-rail" aria-hidden="true">
            <span>KNT</span>
          </div>

          <div className="journey-license-head">
            <div>
              <strong>{profile.originRegion.toUpperCase()} LEAGUE</strong>
              <small>TRAINER REGISTRATION LICENSE</small>
            </div>
            <div className="journey-license-id">{profile.trainerId}</div>
            <button className="journey-edit-toggle" type="button" onClick={() => setEditing((value) => !value)}>
              {editing ? 'CONCLUIR' : 'EDITAR'}
            </button>
          </div>

          <div className={`journey-cover${cover.url ? ' has-image' : ''}`}>
            {cover.url ? <img className="journey-cover-image" src={cover.url} alt="Capa personalizada do treinador" /> : null}
            <span className="journey-cover-mark" aria-hidden="true" />
            <span className="journey-cover-code" aria-hidden="true">KNT</span>
            {editing ? (
              <label className="journey-cover-edit" title="Alterar capa">
                <EditIcon />
                <span>ALTERAR BANNER</span>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Alterar imagem de capa"
                  onChange={(event) => {
                    cover.select(event.currentTarget.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            ) : null}
          </div>

          <div className="journey-identity">
            <div className="journey-avatar-wrap">
              <TrainerAvatar avatarUrl={avatar.url} />
              {editing ? (
                <label className="journey-avatar-edit" title="Alterar foto de perfil">
                  <EditIcon />
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Alterar foto de perfil"
                    onChange={(event) => {
                      avatar.select(event.currentTarget.files?.[0]);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              ) : null}
            </div>

            <div className="journey-identity-copy">
              <h1 id="journey-trainer-name">{profile.trainerName}</h1>
              <span className="journey-trainer-title">— {profile.trainerTitle}</span>
            </div>

            <div className="journey-league-seal" aria-hidden="true">
              <span>KANTO</span>
              <i />
              <small>POKÉMON LEAGUE</small>
            </div>
          </div>

          <div className="journey-location-grid">
            <div>
              <span>REGIÃO DE ORIGEM</span>
              <strong>{profile.originRegion}</strong>
            </div>
            <div>
              <span>LOCALIZAÇÃO ATUAL</span>
              <strong>{profile.currentLocation}</strong>
            </div>
          </div>

          {profile.leadPokemon ? (
            <a
              className="journey-partner"
              href={`/pokemon/${profile.leadPokemon.instanceId}?origin=journey-lead`}
              aria-label={`Abrir ${profile.leadPokemon.nickname}, primeiro Pokémon do Time`}
            >
              <div className="journey-partner-copy">
                <span>PARCEIRO REGISTRADO</span>
                <strong>{profile.leadPokemon.nickname}</strong>
                <small>Nv. {profile.leadPokemon.level}</small>
              </div>
              <div className="journey-partner-portrait" aria-hidden="true">
                <PokemonAssetImage
                  dex={profile.leadPokemon.dex}
                  assetRole="home-artwork"
                  alt=""
                  loading="eager"
                  decoding="async"
                  fallbackLabel="?"
                />
              </div>
            </a>
          ) : null}

          <section className="journey-badges" aria-labelledby="journey-badges-title">
            <div className="journey-section-heading">
              <strong id="journey-badges-title">INSÍGNIAS DE {profile.originRegion.toUpperCase()}</strong>
              <span>{profile.badges.length} GINÁSIOS</span>
            </div>
            <BadgeStrip badges={profile.badges} />
          </section>

          <button className="journey-share-action" type="button" onClick={() => setShowShareCard(true)}>
            <span className="journey-share-action-icon"><CardIcon /></span>
            <span className="journey-share-action-copy">
              <strong>VER TRAINER CARD</strong>
              <small>Prévia horizontal para compartilhar</small>
            </span>
            <span className="journey-share-action-chevron"><ChevronIcon /></span>
          </button>

          <div className="journey-license-footer">
            <span>ISSUED BY {profile.originRegion.toUpperCase()} LEAGUE</span>
            <span>{profile.trainerId}</span>
          </div>
        </section>

        {imageError ? <p className="journey-image-error" role="alert">{imageError}</p> : null}

        <details className="journey-profile-details">
          <summary>
            <span className="journey-details-copy">
              <strong>Sobre o treinador</strong>
              <small>Identidade pessoal</small>
            </span>
            <span className="journey-details-chevron"><ChevronIcon /></span>
          </summary>
          <div className="journey-details-body">
            <dl className="journey-about-grid">
              <div>
                <dt>Idade</dt>
                <dd>{profile.personal.age === null ? 'Não informada' : `${profile.personal.age} anos`}</dd>
              </div>
              <div>
                <dt>Altura</dt>
                <dd>{displayValue(profile.personal.height, 'Não informada')}</dd>
              </div>
              <div className="journey-about-wide">
                <dt>Aparência atual</dt>
                <dd>{displayValue(profile.personal.appearance, 'Nenhuma aparência descrita ainda.')}</dd>
              </div>
              <div className="journey-about-wide">
                <dt>Descrição</dt>
                <dd>{displayValue(profile.personal.bio, 'Nenhuma descrição adicionada ainda.')}</dd>
              </div>
            </dl>
          </div>
        </details>

        <details className="journey-profile-details">
          <summary>
            <span className="journey-details-copy">
              <strong>Registro do treinador</strong>
              <small>Registro oficial da Liga</small>
            </span>
            <span className="journey-details-chevron"><ChevronIcon /></span>
          </summary>
          <div className="journey-details-body">
            <dl className="journey-register-list">
              <div>
                <dt>Região de origem</dt>
                <dd>{profile.originRegion}</dd>
              </div>
              <div>
                <dt>Localização atual</dt>
                <dd>{profile.currentLocation}</dd>
              </div>
              <div>
                <dt>Pokémon possuídos</dt>
                <dd>{profile.ownedPokemonCount}</dd>
              </div>
              <div>
                <dt>Espécies registradas</dt>
                <dd>{profile.registeredSpeciesCount}</dd>
              </div>
            </dl>
          </div>
        </details>
      </div>

      {showShareCard ? (
        <ShareTrainerCard
          profile={profile}
          coverUrl={cover.url}
          avatarUrl={avatar.url}
          onClose={() => setShowShareCard(false)}
        />
      ) : null}
    </main>
  );
}
