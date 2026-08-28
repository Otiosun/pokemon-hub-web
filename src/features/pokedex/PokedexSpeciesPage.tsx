import { useEffect, useMemo, useState } from 'react';
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
  slug: string;
  status: RecordStatus;
  name: string;
  height: string;
  weight: string;
  types: string[];
  habitat: string;
  varieties: SpeciesVariety[];
  evolutionStages: EvolutionSpecies[][];
};

type ReviewAssetPayload = {
  model?: string;
  materials?: Record<string, { texture?: string }>;
};

const TOTAL = 386;
const warmedSpecies = new Set<string>();
const FIELDSET_RESET = { border: 0, margin: 0, padding: 0, minInlineSize: 0 } as const;
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
  unknown: 'DESCONHECIDO',
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
      slug: '',
      status: 'locked',
      name: 'Registro não identificado',
      height: '—',
      weight: '—',
      types: [],
      habitat: '—',
      varieties: [],
      evolutionStages: [],
    };
  }

  const cached = getCachedPokedexSpeciesRuntime(dex);
  return {
    dex,
    slug: cached?.slug ?? review?.slug ?? '',
    status: cached ? 'ready' : 'loading',
    name: cached?.name ?? review?.name ?? getCachedNationalDexName(dex) ?? `Nº ${String(dex).padStart(3, '0')}`,
    height: formatMetric(cached?.height ?? null, 'm'),
    weight: formatMetric(cached?.weight ?? null, 'kg'),
    types: cached?.typeSlugs.map(translateType) ?? review?.types ?? [],
    habitat: cached?.habitat ?? '—',
    varieties: cached?.varieties ?? [],
    evolutionStages: cached?.evolutionStages ?? [],
  };
}

async function warmSpecies3d(slug: string) {
  if (!slug || warmedSpecies.has(slug)) return;
  warmedSpecies.add(slug);

  try {
    const assetPromise = fetch(getPokemonAssetUrl(slug, 'asset.json'), { cache: 'force-cache' });
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
        fetch(getPokemonAssetUrl(slug, assetName), { cache: 'force-cache' }).catch(() => undefined),
      ),
    );
  } catch (error) {
    warmedSpecies.delete(slug);
    console.warn(`3D warmup failed for ${slug}`, error);
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

function ResearchRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'locked' | 'ready';
}) {
  return (
    <div className={`pokedex-species-research-row is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function PokedexSpeciesPage({ dex }: { dex: number }) {
  const validDex = Number.isInteger(dex) && dex >= 1 && dex <= TOTAL ? dex : 1;
  const review = useMemo(() => readDexReview(validDex), [validDex]);
  const playerState = useMemo(() => getSpeciesPlayerStatePreview(validDex), [validDex]);
  const [record, setRecord] = useState<RecordState>(() => initialRecord(validDex, review, playerState));
  const [artworkReadyDex, setArtworkReadyDex] = useState<number | null>(null);
  const [visualModeState, setVisualModeState] = useState<{ dex: number; mode: VisualMode }>({
    dex: validDex,
    mode: 'model',
  });

  const activeRecord = record.dex === validDex ? record : initialRecord(validDex, review, playerState);
  const artworkReady = artworkReadyDex === validDex;
  const visualMode = visualModeState.dex === validDex ? visualModeState.mode : 'model';
  const setVisualMode = (mode: VisualMode) => setVisualModeState({ dex: validDex, mode });
  const discovered = playerState.discovery !== 'unknown';
  const wants3d = discovered && visualMode === 'model';
  const canShow3d = discovered && Boolean(activeRecord.slug);
  const showing3d = wants3d && canShow3d;
  const waitingFor3d = wants3d && !canShow3d && activeRecord.status === 'loading';
  const modelUnavailable = wants3d && !canShow3d && activeRecord.status === 'failed';
  const factsUnlocked = discovered && playerState.researchLevel >= 2;
  const ecologyUnlocked = discovered && playerState.researchLevel >= 3;
  const evolutionUnlocked = discovered && playerState.researchLevel >= 4;

  useEffect(() => {
    if (discovered && activeRecord.slug) void warmSpecies3d(activeRecord.slug);
  }, [activeRecord.slug, discovered]);

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
          slug: payload.slug,
          status: 'ready',
          name: payload.name,
          height: formatMetric(payload.height, 'm'),
          weight: formatMetric(payload.weight, 'kg'),
          types: payload.typeSlugs.map(translateType),
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
  const displayName = discovered ? activeRecord.name : 'Registro não identificado';
  const description = !discovered
    ? 'Esta espécie ainda não foi descoberta. Continue explorando para revelar o registro.'
    : playerState.researchLevel < 2
      ? 'Dados adicionais serão liberados com mais pesquisa de campo.'
      : playerState.researchLevel >= 3 && review?.description
        ? review.description
        : 'Identificação confirmada. Continue pesquisando esta espécie para ampliar o registro de campo.';

  const habitatValue = !discovered
    ? 'Bloqueado'
    : ecologyUnlocked
      ? activeRecord.habitat
      : 'Pesquisa 3 necessária';
  const varietiesValue = !discovered
    ? 'Bloqueado'
    : ecologyUnlocked
      ? `${Math.max(1, activeRecord.varieties.length)} registro${Math.max(1, activeRecord.varieties.length) === 1 ? '' : 's'}`
      : 'Pesquisa 3 necessária';
  const evolutionValue = !discovered
    ? 'Bloqueado'
    : evolutionUnlocked
      ? 'Disponível'
      : 'Pesquisa 4 necessária';

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
        <section className="pokedex-species-stage" aria-label={`Registro visual de ${displayName}`}>
          <div className="pokedex-species-visual-area">
            {discovered && (
              <fieldset className="pokedex-species-view-modes" style={FIELDSET_RESET} aria-label="Modo de visualização da espécie">
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
                  disabled={modelUnavailable}
                  onClick={() => setVisualMode('model')}
                >
                  3D
                </button>
              </fieldset>
            )}

            {discovered && visualMode === 'artwork' && (
              <div className={`pokedex-species-artwork-slot${artworkReady ? ' is-ready' : ''}`}>
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
              </div>
            )}

            {showing3d && (
              <div className="pokedex-species-model-slot">
                <GenerationsPokemonViewer
                  key={`${validDex}-${activeRecord.slug}`}
                  species={activeRecord.slug}
                  name={displayName}
                  onFailedSpeciesChange={() => setVisualMode('artwork')}
                />
                <span className="pokedex-species-model-hint">ARRASTE PARA GIRAR · PINÇA PARA ZOOM</span>
              </div>
            )}

            {(waitingFor3d || modelUnavailable) && (
              <div className="pokedex-species-model-loading" role="status">
                <span>{modelUnavailable ? 'MODELO 3D INDISPONÍVEL' : 'PREPARANDO MODELO 3D'}</span>
                {modelUnavailable && (
                  <button type="button" onClick={() => setVisualMode('artwork')}>VER 2D</button>
                )}
              </div>
            )}

            {!discovered && (
              <div className="pokedex-species-unknown-mark" aria-hidden="true">
                <span>?</span>
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
                </a>
              ) : <span className="is-placeholder" aria-hidden="true" />}
              {nextDex ? (
                <a
                  className="is-next"
                  href={neighbourHref(nextDex)}
                  aria-label={`Abrir próxima espécie, número ${String(nextDex).padStart(3, '0')}`}
                >
                  <SideArrow direction="right" />
                </a>
              ) : <span className="is-placeholder" aria-hidden="true" />}
            </nav>
          </div>

          <div className="pokedex-species-identity">
            <span className="pokedex-species-number">Nº {String(validDex).padStart(3, '0')}</span>
            <h1>{displayName}</h1>
            {discovered && activeRecord.types.length > 0 && (
              <div className="pokedex-species-types">
                {activeRecord.types.map((type) => (
                  <TypeBadge key={type} type={type} accent={typeAccent(type)} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="pokedex-species-data" aria-label="Dados do registro">
          <div className="pokedex-species-player-state">
            <strong className={`is-${playerState.discovery}`}>{DISCOVERY_LABELS[playerState.discovery]}</strong>
            <span>Pesquisa {playerState.researchLevel}/5</span>
            <span>{playerState.ownedCount} possuído{playerState.ownedCount === 1 ? '' : 's'}</span>
          </div>

          <p className="pokedex-species-description">{description}</p>

          {factsUnlocked && (
            <dl className="pokedex-species-facts">
              <div><dt>REGIÃO</dt><dd>{region}</dd></div>
              <div><dt>ALTURA</dt><dd>{activeRecord.height}</dd></div>
              <div><dt>PESO</dt><dd>{activeRecord.weight}</dd></div>
            </dl>
          )}

          <div className="pokedex-species-research-list" aria-label="Pesquisa da espécie">
            <ResearchRow label="HABITAT" value={habitatValue} tone={ecologyUnlocked ? 'ready' : 'locked'} />
            <ResearchRow label="FORMAS / VARIEDADES" value={varietiesValue} tone={ecologyUnlocked ? 'ready' : 'locked'} />
            <ResearchRow label="LINHA EVOLUTIVA" value={evolutionValue} tone={evolutionUnlocked ? 'ready' : 'locked'} />

            {discovered && (
              playerState.ownedCount > 0 ? (
                <a className="pokedex-species-owned-link" href={`/pokemon?species=${validDex}`}>
                  <span>MEUS POKÉMON DESTA ESPÉCIE</span>
                  <strong>{playerState.ownedCount} registro{playerState.ownedCount === 1 ? '' : 's'} →</strong>
                </a>
              ) : (
                <div className="pokedex-species-owned-link is-empty" aria-disabled="true">
                  <span>MEUS POKÉMON DESTA ESPÉCIE</span>
                  <strong>0 registros</strong>
                </div>
              )
            )}
          </div>

          {ecologyUnlocked && activeRecord.varieties.length > 1 && (
            <section className="pokedex-species-varieties" aria-label="Formas e variedades registradas">
              <header>FORMAS REGISTRADAS</header>
              <div>
                {activeRecord.varieties.slice(0, 8).map((variety) => (
                  <span key={variety.name} className={variety.isDefault ? 'is-default' : undefined}>
                    {variety.name}{variety.isDefault ? ' · BASE' : ''}
                  </span>
                ))}
              </div>
            </section>
          )}

          {evolutionUnlocked && (
            <section className="pokedex-species-evolution" aria-label="Linha evolutiva">
              <header>LINHA EVOLUTIVA</header>
              {activeRecord.evolutionStages.length > 0
                ? <EvolutionTree stages={activeRecord.evolutionStages} />
                : <p>Sem evolução catalogada.</p>}
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
