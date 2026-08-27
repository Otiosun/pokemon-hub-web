import { useEffect, useMemo, useRef, useState } from 'react';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { getPokemonAssetUrl } from '../../visual-assets/assetBaseUrl';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import {
  FIELD_DEX_REVIEW_SPECIES,
  typeAccent,
  type FieldDexSpecies,
} from '../pokemon-detail/fieldDexSpecies';
import { formatNationalDexName, getCachedNationalDexName } from './nationalDexRuntime';
import {
  getCachedPokedexSpeciesRuntime,
  loadPokedexSpeciesRuntime,
  type EvolutionSpecies,
  type SpeciesVariety,
} from './pokedexSpeciesRuntime';
import {
  getSpeciesPlayerStatePreview,
  type SpeciesDiscoveryState,
  type SpeciesPlayerState,
} from './speciesPlayerStatePreview';
import './pokedex-index.css';
import './pokedex-species.css';

type RecordStatus = 'locked' | 'loading' | 'ready' | 'failed';
type VisualMode = 'artwork' | 'model';

type RecordState = {
  dex: number;
  status: RecordStatus;
  name: string;
  height: string;
  weight: string;
  types: string[];
  cryUrl: string | null;
  habitat: string;
  varieties: SpeciesVariety[];
  evolutionStages: EvolutionSpecies[][];
};

type ReviewAssetPayload = {
  model?: string;
  materials?: Record<string, { texture?: string }>;
};

const TOTAL = 386;
const warmedReviewSpecies = new Set<string>();
const RESEARCH_STEPS = [1, 2, 3, 4, 5] as const;
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
const DISCOVERY_LABELS: Record<SpeciesDiscoveryState, string> = {
  unknown: 'NÃO REGISTRADO',
  seen: 'AVISTADO',
  caught: 'CAPTURADO',
};

function regionForDex(dex: number) {
  if (dex <= 151) return 'Kanto';
  if (dex <= 251) return 'Johto';
  return 'Hoenn';
}

function translateType(value: string) {
  return TYPE_LABELS[value] ?? formatNationalDexName(value);
}

function formatMetric(value: number | null, unit: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`;
}

function readDexReview(dex: number) {
  return FIELD_DEX_REVIEW_SPECIES.find((species) => species.dex === dex);
}

function neighbourHref(dex: number) {
  return `/pokedex/${String(dex).padStart(3, '0')}`;
}

function initialRecord(
  dex: number,
  review: FieldDexSpecies | undefined,
  playerState: SpeciesPlayerState,
): RecordState {
  if (playerState.discovery === 'unknown') {
    return {
      dex,
      status: 'locked',
      name: 'Espécie não registrada',
      height: '—',
      weight: '—',
      types: [],
      cryUrl: null,
      habitat: '—',
      varieties: [],
      evolutionStages: [],
    };
  }

  const cached = getCachedPokedexSpeciesRuntime(dex);
  return {
    dex,
    status: cached ? 'ready' : 'loading',
    name: cached?.name ?? review?.name ?? getCachedNationalDexName(dex) ?? `Nº ${String(dex).padStart(3, '0')}`,
    height: formatMetric(cached?.height ?? null, 'm'),
    weight: formatMetric(cached?.weight ?? null, 'kg'),
    types: cached?.typeSlugs.map(translateType) ?? review?.types ?? [],
    cryUrl: cached?.cryUrl ?? null,
    habitat: cached?.habitat ?? '—',
    varieties: cached?.varieties ?? [],
    evolutionStages: cached?.evolutionStages ?? [],
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

function ResearchMeter({ level }: { level: SpeciesPlayerState['researchLevel'] }) {
  return (
    <div
      className="pokedex-species-research-meter"
      role="progressbar"
      aria-label="Nível de pesquisa"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={level}
      aria-valuetext={`Pesquisa ${level} de 5`}
    >
      {RESEARCH_STEPS.map((step) => (
        <span key={step} className={step <= level ? 'is-filled' : undefined} aria-hidden="true" />
      ))}
    </div>
  );
}

function EvolutionTree({ stages }: { stages: EvolutionSpecies[][] }) {
  return (
    <div className="pokedex-species-evolution-tree">
      {stages.map((stage, stageIndex) => (
        <div className="pokedex-species-evolution-stage" key={stage.map((species) => species.dex).join('-')}>
          {stageIndex > 0 && <span className="pokedex-species-evolution-arrow" aria-hidden="true">→</span>}
          <div>
            {stage.map((species) => (
              <a href={neighbourHref(species.dex)} key={species.dex}>
                <PokemonAssetImage
                  dex={species.dex}
                  assetRole="icon"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  fallbackLabel="?"
                />
                <span>#{String(species.dex).padStart(3, '0')}</span>
                <strong>{species.name}</strong>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PokedexSpeciesPage({ dex }: { dex: number }) {
  const validDex = Number.isInteger(dex) && dex >= 1 && dex <= TOTAL ? dex : 1;
  const review = useMemo(() => readDexReview(validDex), [validDex]);
  const playerState = useMemo(() => getSpeciesPlayerStatePreview(validDex), [validDex]);
  const [record, setRecord] = useState<RecordState>(() => initialRecord(validDex, review, playerState));
  const [artworkReadyDex, setArtworkReadyDex] = useState<number | null>(null);
  const [visualMode, setVisualMode] = useState<VisualMode>('artwork');
  const cryAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeRecord = record.dex === validDex ? record : initialRecord(validDex, review, playerState);
  const artworkReady = artworkReadyDex === validDex;
  const discovered = playerState.discovery !== 'unknown';
  const canShow3d = Boolean(review && discovered);
  const showing3d = canShow3d && visualMode === 'model';
  const factsUnlocked = playerState.researchLevel >= 2;
  const ecologyUnlocked = playerState.researchLevel >= 3;
  const evolutionUnlocked = playerState.researchLevel >= 4;

  useEffect(() => {
    setVisualMode('artwork');
  }, [validDex]);

  useEffect(() => {
    if (review && discovered) void warmReview3d(review);
  }, [discovered, review]);

  useEffect(() => {
    const controller = new AbortController();
    setArtworkReadyDex(null);
    setRecord(initialRecord(validDex, review, playerState));

    if (!discovered) return () => controller.abort();

    async function loadRecord() {
      try {
        const payload = await loadPokedexSpeciesRuntime(validDex, controller.signal);
        setRecord({
          dex: validDex,
          status: 'ready',
          name: payload.name,
          height: formatMetric(payload.height, 'm'),
          weight: formatMetric(payload.weight, 'kg'),
          types: payload.typeSlugs.map(translateType),
          cryUrl: payload.cryUrl,
          habitat: payload.habitat,
          varieties: payload.varieties,
          evolutionStages: payload.evolutionStages,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn(`National Dex record ${validDex} unavailable`, error);
        setRecord((current) => current.dex === validDex ? { ...current, status: 'failed' } : current);
      }
    }

    void loadRecord();
    return () => controller.abort();
  }, [discovered, playerState, review, validDex]);

  const previousDex = validDex > 1 ? validDex - 1 : null;
  const nextDex = validDex < TOTAL ? validDex + 1 : null;
  const region = regionForDex(validDex);
  const description = !discovered
    ? 'Registro bloqueado. Avistar esta espécie libera sua identificação básica.'
    : playerState.researchLevel >= 3
      ? review?.description ?? 'Observações de campo ainda não foram integradas ao RPG para esta espécie.'
      : 'Identificação confirmada. Continue pesquisando esta espécie para liberar observações de campo.';
  const displayName = discovered ? activeRecord.name : 'Registro desconhecido';

  const playCry = () => {
    const audio = cryAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  };

  return (
    <main className={`pokedex-species-page is-${playerState.discovery}`}>
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
        <div className={`pokedex-species-stage${artworkReady ? ' is-artwork-ready' : ' is-artwork-loading'}${showing3d ? ' is-model-mode' : ''}`}>
          <div className="pokedex-species-stage-top">
            <span>NATIONAL {String(validDex).padStart(3, '0')} · {region.toUpperCase()}</span>
            <span className={`pokedex-species-sync is-${activeRecord.status}`}>
              <i aria-hidden="true" />
              {activeRecord.status === 'ready'
                ? 'ARQUIVO SINCRONIZADO'
                : activeRecord.status === 'failed'
                  ? 'MODO OFFLINE'
                  : activeRecord.status === 'locked'
                    ? 'DADOS BLOQUEADOS'
                    : 'SINCRONIZANDO'}
            </span>
          </div>

          {canShow3d && (
            <div className="pokedex-species-view-modes" role="group" aria-label="Modo de visualização da espécie">
              <button
                type="button"
                className={visualMode === 'artwork' ? 'is-active' : undefined}
                aria-pressed={visualMode === 'artwork'}
                onClick={() => setVisualMode('artwork')}
              >
                2D
              </button>
              <button
                type="button"
                className={visualMode === 'model' ? 'is-active' : undefined}
                aria-pressed={visualMode === 'model'}
                onClick={() => setVisualMode('model')}
              >
                3D
              </button>
            </div>
          )}

          {!showing3d && (
            <div className="pokedex-species-artwork-slot">
              {discovered ? (
                <PokemonAssetImage
                  key={validDex}
                  dex={validDex}
                  assetRole="official-artwork"
                  className="pokedex-species-artwork"
                  alt={`Ilustração de ${displayName}`}
                  decoding="async"
                  fetchPriority="high"
                  fallbackLabel="?"
                  onResolved={() => setArtworkReadyDex(validDex)}
                />
              ) : (
                <div className="pokedex-species-unknown-mark" aria-hidden="true">
                  <span>?</span>
                </div>
              )}
            </div>
          )}

          {showing3d && review && (
            <div className="pokedex-species-model-slot">
              <GenerationsPokemonViewer
                species={review.slug}
                name={displayName}
                onFailedSpeciesChange={() => setVisualMode('artwork')}
              />
              <span className="pokedex-species-model-hint">ARRASTE PARA GIRAR · PINÇA PARA ZOOM</span>
            </div>
          )}

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
            <span className="pokedex-species-mode">
              {discovered ? (showing3d ? 'VISUAL 3D · ESPÉCIE' : 'REGISTRO 2D · ESPÉCIE') : 'ARQUIVO BLOQUEADO'}
            </span>
            <h1>{displayName}</h1>
            <div className="pokedex-species-types">
              {discovered && activeRecord.types.length > 0
                ? activeRecord.types.map((type) => (
                    <TypeBadge key={type} type={type} accent={typeAccent(type)} />
                  ))
                : <span className="pokedex-species-locked-inline">TIPO NÃO REGISTRADO</span>}
            </div>
          </div>
        </div>

        <div className="pokedex-species-data">
          <section className="pokedex-species-player-state" aria-label="Estado desta espécie na Pokédex">
            <div className={`pokedex-species-discovery is-${playerState.discovery}`}>
              <span>DESCOBERTA</span>
              <strong>{DISCOVERY_LABELS[playerState.discovery]}</strong>
            </div>
            <div className="pokedex-species-research">
              <div>
                <span>PESQUISA</span>
                <strong>{playerState.researchLevel} / 5</strong>
              </div>
              <ResearchMeter level={playerState.researchLevel} />
            </div>
            <div className="pokedex-species-owned-readout">
              <span>COLEÇÃO</span>
              <strong>{playerState.ownedCount}</strong>
              <small>{playerState.shinyOwned ? 'SHINY POSSUÍDO' : playerState.shinySeen ? 'SHINY REGISTRADO' : 'SEM SHINY'}</small>
            </div>
          </section>

          <div className="pokedex-species-data-head">
            <div>
              <span>REGISTRO DA ESPÉCIE</span>
              <strong>{discovered ? review?.category ?? `Arquivo Nacional #${String(validDex).padStart(3, '0')}` : 'Identificação pendente'}</strong>
            </div>
            <div className="pokedex-species-actions">
              {activeRecord.cryUrl && discovered && (
                <button type="button" className="pokedex-species-cry" onClick={playCry}>
                  OUVIR CRY
                </button>
              )}
            </div>
          </div>

          {activeRecord.cryUrl && <audio ref={cryAudioRef} src={activeRecord.cryUrl} preload="none" />}

          <p className="pokedex-species-description">{description}</p>

          <dl className="pokedex-species-facts">
            <div><dt>REGIÃO</dt><dd>{discovered ? region : '—'}</dd></div>
            <div>
              <dt>TIPO</dt>
              <dd className="pokedex-species-fact-types">
                {discovered && activeRecord.types.length > 0
                  ? activeRecord.types.map((type) => (
                      <TypeBadge key={type} type={type} accent={typeAccent(type)} compact />
                    ))
                  : '—'}
              </dd>
            </div>
            <div><dt>ALTURA</dt><dd>{factsUnlocked ? activeRecord.height : 'PESQUISA 2'}</dd></div>
            <div><dt>PESO</dt><dd>{factsUnlocked ? activeRecord.weight : 'PESQUISA 2'}</dd></div>
          </dl>

          <section className="pokedex-species-field-grid" aria-label="Pesquisa ecológica da espécie">
            <div className={ecologyUnlocked ? undefined : 'is-locked'}>
              <span>HABITAT</span>
              <strong>{ecologyUnlocked ? activeRecord.habitat : 'BLOQUEADO'}</strong>
              <small>PESQUISA 3</small>
            </div>
            <div className={ecologyUnlocked ? undefined : 'is-locked'}>
              <span>FORMAS / VARIEDADES</span>
              <strong>{ecologyUnlocked ? Math.max(1, activeRecord.varieties.length) : '—'}</strong>
              <small>{ecologyUnlocked ? 'REGISTROS CONHECIDOS' : 'PESQUISA 3'}</small>
            </div>
          </section>

          {ecologyUnlocked && activeRecord.varieties.length > 1 && (
            <section className="pokedex-species-varieties" aria-label="Formas e variedades registradas">
              <header><span>FORMAS REGISTRADAS</span></header>
              <div>
                {activeRecord.varieties.slice(0, 8).map((variety) => (
                  <span key={variety.name} className={variety.isDefault ? 'is-default' : undefined}>
                    {variety.name}{variety.isDefault ? ' · BASE' : ''}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className={`pokedex-species-evolution${evolutionUnlocked ? '' : ' is-locked'}`}>
            <header>
              <div><span>LINHA EVOLUTIVA</span><strong>{evolutionUnlocked ? 'REGISTRO CONECTADO' : 'PESQUISA 4 NECESSÁRIA'}</strong></div>
            </header>
            {evolutionUnlocked && activeRecord.evolutionStages.length > 0
              ? <EvolutionTree stages={activeRecord.evolutionStages} />
              : <div className="pokedex-species-evolution-locked">{evolutionUnlocked ? 'SEM EVOLUÇÃO CATALOGADA' : 'DADOS BLOQUEADOS'}</div>}
          </section>

          {playerState.ownedCount > 0 && (
            <a className="pokedex-species-owned-link" href={`/pokemon?species=${validDex}`}>
              <span>MEUS POKÉMON DESTA ESPÉCIE</span>
              <strong>{playerState.ownedCount} REGISTRO{playerState.ownedCount === 1 ? '' : 'S'} →</strong>
            </a>
          )}

          <div className="pokedex-species-note">
            <strong>CAMADA DE CAMPO</strong>
            <p>
              Descoberta, pesquisa e coleção são eixos separados. Nesta versão, o estado do jogador é um contrato de demonstração; dados biológicos vêm do provider de espécie e serão ligados ao backend sem duplicar regra mecânica no frontend.
            </p>
          </div>

          <nav className="pokedex-species-nav is-index-only" aria-label="Voltar ao Índice Nacional">
            <a className="is-index" href="/pokedex" data-nav-mode="up">ÍNDICE 001—386</a>
          </nav>
        </div>
      </section>
    </main>
  );
}
