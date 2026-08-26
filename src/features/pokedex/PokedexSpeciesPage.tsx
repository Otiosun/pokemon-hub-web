import { useEffect, useMemo, useState } from 'react';
import { getPokemonAssetUrl } from '../../visual-assets/assetBaseUrl';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import {
  FIELD_DEX_REVIEW_SPECIES,
  getFieldDexVisual,
  typeAccent,
  type FieldDexSpecies,
} from '../pokemon-detail/fieldDexSpecies';
import {
  formatNationalDexName,
  getCachedNationalDexName,
} from './nationalDexRuntime';
import './pokedex-index.css';
import './pokedex-species.css';

type PokemonPayload = {
  name?: string;
  height?: number;
  weight?: number;
  types?: Array<{ slot?: number; type?: { name?: string } }>;
};

type RecordState = {
  dex: number;
  status: 'loading' | 'ready' | 'failed';
  name: string;
  height: string;
  weight: string;
  types: string[];
};

type ReviewAssetPayload = {
  model?: string;
  materials?: Record<string, { texture?: string }>;
};

const TOTAL = 386;
const warmedReviewSpecies = new Set<string>();
const TYPE_LABELS: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  electric: 'Elétrico',
  grass: 'Planta',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Veneno',
  ground: 'Terrestre',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Aço',
  fairy: 'Fada',
};

function regionForDex(dex: number) {
  if (dex <= 151) return 'Kanto';
  if (dex <= 251) return 'Johto';
  return 'Hoenn';
}

function translateType(value: string) {
  return TYPE_LABELS[value] ?? formatNationalDexName(value);
}

function formatMetric(value: number | undefined, divisor: number, unit: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${(value / divisor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`;
}

function readDexReview(dex: number) {
  return FIELD_DEX_REVIEW_SPECIES.find((species) => species.dex === dex);
}

function neighbourHref(dex: number) {
  return `/pokedex/${String(dex).padStart(3, '0')}`;
}

function initialRecord(dex: number, review: FieldDexSpecies | undefined): RecordState {
  return {
    dex,
    status: 'loading',
    name: review?.name ?? getCachedNationalDexName(dex) ?? `Nº ${String(dex).padStart(3, '0')}`,
    height: review?.height ?? '—',
    weight: review?.weight ?? '—',
    types: review?.types ?? [],
  };
}

async function warmReview3d(review: FieldDexSpecies) {
  if (warmedReviewSpecies.has(review.slug)) return;
  warmedReviewSpecies.add(review.slug);

  try {
    const assetPromise = fetch(getPokemonAssetUrl(review.slug, 'asset.json'), { cache: 'force-cache' });
    await Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]);

    const assetResponse = await assetPromise;
    if (!assetResponse.ok) throw new Error(`asset.json HTTP ${assetResponse.status}`);
    const payload = (await assetResponse.json()) as ReviewAssetPayload;
    if (!payload.model) return;

    const textureNames = Object.values(payload.materials ?? {})
      .map((binding) => binding.texture)
      .filter((value): value is string => Boolean(value));
    const assetNames = [payload.model, ...new Set(textureNames)];
    await Promise.all(
      assetNames.map((assetName) =>
        fetch(getPokemonAssetUrl(review.slug, assetName), { cache: 'force-cache' }).catch(() => undefined),
      ),
    );
  } catch (error) {
    warmedReviewSpecies.delete(review.slug);
    console.warn(`3D warmup failed for ${review.slug}`, error);
  }
}

function SideArrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PokedexSpeciesPage({ dex }: { dex: number }) {
  const validDex = Number.isInteger(dex) && dex >= 1 && dex <= TOTAL ? dex : 1;
  const review = useMemo(() => readDexReview(validDex), [validDex]);
  const visual = getFieldDexVisual(validDex);
  const [record, setRecord] = useState<RecordState>(() => initialRecord(validDex, review));
  const [artworkReadyDex, setArtworkReadyDex] = useState<number | null>(null);
  const activeRecord = record.dex === validDex ? record : initialRecord(validDex, review);
  const artworkReady = artworkReadyDex === validDex;

  useEffect(() => {
    if (review) void warmReview3d(review);
  }, [review]);

  useEffect(() => {
    const controller = new AbortController();
    setRecord(initialRecord(validDex, review));

    async function loadRecord() {
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${validDex}`, {
          signal: controller.signal,
          cache: 'force-cache',
        });
        if (!response.ok) throw new Error(`PokéAPI HTTP ${response.status}`);
        const payload = (await response.json()) as PokemonPayload;
        const types = [...(payload.types ?? [])]
          .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
          .map((item) => item.type?.name)
          .filter((value): value is string => Boolean(value))
          .map(translateType);

        setRecord({
          dex: validDex,
          status: 'ready',
          name: payload.name ? formatNationalDexName(payload.name) : review?.name ?? `Nº ${String(validDex).padStart(3, '0')}`,
          height: formatMetric(payload.height, 10, 'm'),
          weight: formatMetric(payload.weight, 10, 'kg'),
          types: types.length > 0 ? types : review?.types ?? [],
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn(`National Dex record ${validDex} unavailable`, error);
        setRecord((current) => current.dex === validDex ? { ...current, status: 'failed' } : current);
      }
    }

    void loadRecord();
    return () => controller.abort();
  }, [review, validDex]);

  const previousDex = validDex > 1 ? validDex - 1 : null;
  const nextDex = validDex < TOTAL ? validDex + 1 : null;
  const region = regionForDex(validDex);
  const description =
    review?.description ??
    'Arquivo-base da espécie. Observações de campo, comportamento e registros do RPG serão incorporados quando disponíveis.';

  return (
    <main className="pokedex-species-page">
      <header className="pokedex-index-header">
        <a
          className="pokedex-index-brand"
          href="/pokedex"
          aria-label="Voltar ao Índice Nacional"
          data-nav-mode="up"
        >
          <span className="pokedex-index-lens" aria-hidden="true" />
          <span>
            <strong>FIELD DEX</strong>
            <small>REGISTRO NACIONAL</small>
          </span>
        </a>
        <div className="pokedex-index-counter">
          <small>NATIONAL</small>
          <strong>{String(validDex).padStart(3, '0')} / 386</strong>
        </div>
      </header>

      <section className="pokedex-species-shell">
        <div className={`pokedex-species-stage${artworkReady ? ' is-artwork-ready' : ' is-artwork-loading'}`}>
          <div className="pokedex-species-stage-top">
            <span>NATIONAL {String(validDex).padStart(3, '0')} · {region.toUpperCase()}</span>
            <span className={`pokedex-species-sync is-${activeRecord.status}`}>
              <i aria-hidden="true" />
              {activeRecord.status === 'ready' ? 'ARQUIVO SINCRONIZADO' : activeRecord.status === 'failed' ? 'MODO OFFLINE' : 'SINCRONIZANDO'}
            </span>
          </div>

          <div className="pokedex-species-artwork-slot">
            <img
              key={validDex}
              className="pokedex-species-artwork"
              src={visual.artworkOfficial}
              alt={`Ilustração de ${activeRecord.name}`}
              decoding="async"
              fetchPriority="high"
              onLoad={() => setArtworkReadyDex(validDex)}
            />
          </div>

          <nav className="pokedex-species-side-nav" aria-label="Espécies anterior e próxima">
            {previousDex ? (
              <a
                className="is-previous"
                href={neighbourHref(previousDex)}
                aria-label={`Abrir espécie anterior, número ${String(previousDex).padStart(3, '0')}`}
              >
                <SideArrow direction="left" />
                <span>#{String(previousDex).padStart(3, '0')}</span>
              </a>
            ) : <span className="is-placeholder" aria-hidden="true" />}
            {nextDex ? (
              <a
                className="is-next"
                href={neighbourHref(nextDex)}
                aria-label={`Abrir próxima espécie, número ${String(nextDex).padStart(3, '0')}`}
              >
                <span>#{String(nextDex).padStart(3, '0')}</span>
                <SideArrow direction="right" />
              </a>
            ) : <span className="is-placeholder" aria-hidden="true" />}
          </nav>

          <div className="pokedex-species-identity">
            <span className="pokedex-species-mode">ARQUIVO 2D · ESPÉCIE</span>
            <h1>{activeRecord.name}</h1>
            <div className="pokedex-species-types">
              {activeRecord.types.map((type) => (
                <TypeBadge key={type} type={type} accent={typeAccent(type)} />
              ))}
            </div>
          </div>
        </div>

        <div className="pokedex-species-data">
          <div className="pokedex-species-data-head">
            <div>
              <span>REGISTRO DA ESPÉCIE</span>
              <strong>{review?.category ?? `Arquivo Nacional #${String(validDex).padStart(3, '0')}`}</strong>
            </div>
            {review && (
              <a className="pokedex-species-3d" href={`/pokemon/${review.routeSlug}`}>
                INSPECIONAR EM 3D
              </a>
            )}
          </div>

          <p className="pokedex-species-description">{description}</p>

          <dl className="pokedex-species-facts">
            <div><dt>REGIÃO</dt><dd>{region}</dd></div>
            <div>
              <dt>TIPO</dt>
              <dd className="pokedex-species-fact-types">
                {activeRecord.types.length > 0
                  ? activeRecord.types.map((type) => (
                      <TypeBadge key={type} type={type} accent={typeAccent(type)} compact />
                    ))
                  : '—'}
              </dd>
            </div>
            <div><dt>ALTURA</dt><dd>{activeRecord.height}</dd></div>
            <div><dt>PESO</dt><dd>{activeRecord.weight}</dd></div>
          </dl>

          <div className="pokedex-species-note">
            <strong>CAMADA DE CAMPO</strong>
            <p>Este registro leve não carrega WebGL. O modelo 3D é ativado apenas quando a espécie possui um pacote publicado para inspeção.</p>
          </div>

          <nav className="pokedex-species-nav is-index-only" aria-label="Voltar ao Índice Nacional">
            <a className="is-index" href="/pokedex" data-nav-mode="up">ÍNDICE 001—386</a>
          </nav>
        </div>
      </section>
    </main>
  );
}
