import { useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { getJourneyProfilePreview } from './journeyProfilePreview';
import './journey-page.css';

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
      <path d="m7 9 5 5 5-5" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.6-4.2 2.8-6.3 6.5-6.3s5.9 2.1 6.5 6.3" />
    </svg>
  );
}

function RegisterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19V9M12 19V5M19 19v-7" />
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

export function JourneyPage() {
  const profile = getJourneyProfilePreview();
  const cover = useImagePreview('cover');
  const avatar = useImagePreview('avatar');
  const imageError = cover.error ?? avatar.error;

  return (
    <main className="journey-page">
      <HubModuleHeader module="journey" metaLabel="REGIÃO" metaValue={profile.originRegion.toUpperCase()} />

      <div className="journey-profile-shell">
        <section className="journey-profile-card" aria-labelledby="journey-trainer-name">
          <div className="journey-cover">
            {cover.url ? <img className="journey-cover-image" src={cover.url} alt="Capa personalizada do perfil" /> : null}
            <span className="journey-cover-mark" aria-hidden="true" />
            <label className="journey-cover-edit" title="Alterar capa">
              <EditIcon />
              <span>CAPA</span>
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
          </div>

          <div className="journey-identity">
            <div className="journey-avatar-wrap">
              <div
                className={`journey-avatar${avatar.url ? ' has-image' : ''}`}
                style={avatar.url ? { backgroundImage: `url(${avatar.url})` } : undefined}
                aria-label={avatar.url ? 'Foto de perfil personalizada' : 'Perfil sem foto personalizada'}
                role="img"
              >
                {avatar.url ? null : (
                  <span className="journey-avatar-ball" aria-hidden="true">
                    <i />
                  </span>
                )}
              </div>
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
            </div>

            <div className="journey-identity-copy">
              <h1 id="journey-trainer-name">{profile.trainerName}</h1>
              <span className="journey-trainer-tag">TREINADOR</span>
              <div className="journey-trainer-meta">
                <span>{profile.originRegion}</span>
                <i aria-hidden="true" />
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
                  <span>TIME · SLOT 1</span>
                  <strong>{profile.leadPokemon.nickname}</strong>
                  <small>{profile.leadPokemon.species} · NV. {profile.leadPokemon.level}</small>
                </div>
                <div className="journey-partner-portrait" aria-hidden="true">
                  <PokemonAssetImage
                    dex={profile.leadPokemon.dex}
                    assetRole="portrait"
                    alt=""
                    loading="eager"
                    decoding="async"
                    fallbackLabel="?"
                  />
                </div>
              </a>
            ) : null}
          </div>
        </section>

        {imageError ? <p className="journey-image-error" role="alert">{imageError}</p> : null}

        <details className="journey-profile-details">
          <summary>
            <span className="journey-details-icon"><PersonIcon /></span>
            <span className="journey-details-copy">
              <strong>Sobre o treinador</strong>
              <small>Idade, aparência e descrição</small>
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
            <span className="journey-details-icon"><RegisterIcon /></span>
            <span className="journey-details-copy">
              <strong>Registro do treinador</strong>
              <small>{profile.ownedPokemonCount} Pokémon · {profile.registeredSpeciesCount} espécies registradas</small>
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
    </main>
  );
}
