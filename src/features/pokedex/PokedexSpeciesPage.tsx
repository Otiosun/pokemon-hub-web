import { useEffect, useMemo, useState } from 'react';
import { SpeciesPokemonImage } from '../../visual-assets/PokemonPreviewImage';
import { getPokemonAssetUrl } from '../../visual-assets/assetBaseUrl';
import {
  getPokemon3dCapability,
  type Pokemon3dCapabilityStatus,
} from '../../visual-assets/pokemon3dCapability';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import type { PokemonVisualVariant } from '../../visual-assets/pokemonVisualRegistry';
import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import { useOwnedPokemonCollection } from '../collection/useOwnedPokemonCollection';
import {
  FIELD_DEX_REVIEW_SPECIES,
  typeAccent,
  type FieldDexSpecies,
} from '../pokemon-detail/fieldDexSpecies';
import {
  readPokedexVisualPreference,
  rememberPokedexVisualPreference,
} from '../pokemon-detail/pokemonVisualPreference';
import { formatNationalDexName, getCachedNationalDexName } from './nationalDexRuntime';
import {
  getCachedPokedexSpeciesRuntime,
  loadPokedexSpeciesRuntime,
  type EvolutionTreeNode,
  type SpeciesVariety,
} from './pokedexSpeciesRuntime';
import {
  getAuthoritativePokedexSpeciesState,
  usePlayerPortalPokedex,
  type AuthoritativePokedexSpeciesState,
  type PokedexDiscoveryState,
} from './usePlayerPortalPokedex';
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
  evolutionTree: EvolutionTreeNode | null;
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
const DISCOVERY_LABELS: Record<PokedexDiscoveryState, string> = {
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

function formatTimestamp(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
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
  playerState: AuthoritativePokedexSpeciesState,
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
      evolutionTree: null,
    };
  }

  const cached = getCachedPokedexSpeciesRuntime(dex);
  return {
    dex,
    slug: cached?.slug ?? review?.slug ?? '',
    status: cached ? 'ready' : 'loading',
    name:
      cached?.name ??
      review?.name ??
      getCachedNationalDexName(dex) ??
      `Nº ${String(dex).padStart(3, '0')}`,
    height: formatMetric(cached?.height ?? null, 'm'),
    weight: formatMetric(cached?.weight ?? null, 'kg'),
    types: cached?.typeSlugs.map(translateType) ?? review?.types ?? [],
    habitat: cached?.habitat ?? '—',
    varieties: cached?.varieties ?? [],
    evolutionTree: cached?.evolutionTree ?? null,
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

function EvolutionBranch({
  node,
  root = false,
}: {
  node: EvolutionTreeNode;
  root?: boolean;
}) {
  return (
    <div className={`pokedex-species-evolution-branch${root ? ' is-root' : ''}`}>
      {!root ? (
        <section className="pokedex-species-evolution-edge" aria-label="Condição de evolução">
          <span className="pokedex-species-evolution-line" aria-hidden="true" />
          <div>
            {(node.conditions.length > 0 ? node.conditions : ['Evolução']).map((condition) => (
              <span key={condition}>{condition}</span>
            ))}
          </div>
          <span className="pokedex-species-evolution-arrow" aria-hidden="true">↓</span>
        </section>
      ) : null}

      <a
        className="pokedex-species-evolution-card"
        href={neighbourHref(node.species.dex)}
        aria-label={`Abrir ${node.species.name}, número ${node.species.dex}`}
      >
        <SpeciesPokemonImage
          dex={node.species.dex}
          assetRole="icon"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          fallbackLabel="?"
        />
        <span>#{String(node.species.dex).padStart(3, '0')}</span>
        <strong>{node.species.name}</strong>
      </a>

      {node.children.length > 0 ? (
        <div className="pokedex-species-evolution-children">
          {node.children.map((child) => (
            <EvolutionBranch key={`${node.species.dex}-${child.species.dex}`} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EvolutionTree({ tree }: { tree: EvolutionTreeNode }) {
  return (
    <div className="pokedex-species-evolution-tree">
      <EvolutionBranch node={tree} root />
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

function PortalStateMessage({ status }: { status: 'loading' | 'unauthenticated' | 'unavailable' }) {
  const title =
    status === 'loading'
      ? 'CARREGANDO SEU REGISTRO'
      : status === 'unauthenticated'
        ? 'ABRA SEU HUB PELO WHATSAPP'
        : 'NÃO FOI POSSÍVEL CARREGAR SEU REGISTRO';
  const detail =
    status === 'unauthenticated'
      ? 'Use /hub para acessar a Pokédex vinculada ao seu treinador.'
      : status === 'unavailable'
        ? 'Tente novamente em instantes.'
        : 'Sincronizando sua Pokédex.';

  return (
    <main className="pokedex-species-page">
      <header className="pokedex-index-header">
        <a className="pokedex-index-brand" href="/pokedex" aria-label="Voltar ao Índice Nacional">
          <span className="pokedex-index-lens" aria-hidden="true" />
          <span>
            <strong>FIELD DEX</strong>
            <small>REGISTRO NACIONAL</small>
          </span>
        </a>
      </header>
      <section className="pokedex-index-shell">
        <div className="pokedex-index-empty" role="status">
          <strong>{title}</strong>
          <span>{detail}</span>
        </div>
      </section>
    </main>
  );
}

export function PokedexSpeciesPage({ dex }: { dex: number }) {
  const validDex = Number.isInteger(dex) && dex >= 1 && dex <= TOTAL ? dex : 1;
  const review = useMemo(() => readDexReview(validDex), [validDex]);
  const pokedexState = usePlayerPortalPokedex();
  const ownedPokemonState = useOwnedPokemonCollection();
  const pokedexByDex = useMemo(() => {
    if (pokedexState.status !== 'authenticated') return new Map();
    return new Map(pokedexState.pokedex.map((entry) => [entry.nationalDex, entry]));
  }, [pokedexState]);
  const playerState = useMemo(
    () => getAuthoritativePokedexSpeciesState(pokedexByDex.get(validDex)),
    [pokedexByDex, validDex],
  );
  const ownedCount = useMemo(() => {
    if (ownedPokemonState.status !== 'authenticated') return null;
    return ownedPokemonState.pokemon.filter((pokemon) => pokemon.nationalDex === validDex).length;
  }, [ownedPokemonState, validDex]);
  const [record, setRecord] = useState<RecordState>(() =>
    initialRecord(validDex, review, playerState),
  );
  const [artworkReadyKey, setArtworkReadyKey] = useState<string | null>(null);
  const [visualVariant, setVisualVariant] = useState<PokemonVisualVariant>('regular');
  const [visualMode, setVisualMode] = useState<VisualMode>(() =>
    readPokedexVisualPreference('2d') === '3d' ? 'model' : 'artwork',
  );
  const [modelCapability, setModelCapability] =
    useState<Pokemon3dCapabilityStatus>('checking');
  const [modelReady, setModelReady] = useState(false);
  const [modelRetryNonce, setModelRetryNonce] = useState(0);

  const activeRecord =
    record.dex === validDex ? record : initialRecord(validDex, review, playerState);
  const artworkKey = `${validDex}:${visualVariant}`;
  const artworkReady = artworkReadyKey === artworkKey;
  const discovered = playerState.discovery !== 'unknown';
  const shinyRegistered =
    playerState.shinyHistoryAvailable &&
    (() => {
      try {
        return BigInt(playerState.shinySeenCount) > 0n;
      } catch {
        return false;
      }
    })();
  const wants3d = discovered && visualMode === 'model';
  const modelCanRender = wants3d && modelCapability === 'ready';
  const showing3d = modelCanRender && modelReady;
  const waitingFor3d =
    wants3d &&
    (modelCapability === 'checking' || (modelCapability === 'ready' && !modelReady));
  const modelUnavailable = wants3d && modelCapability === 'unsupported';
  const modelFailed = wants3d && modelCapability === 'failed';

  const chooseVisualVariant = (variant: PokemonVisualVariant) => {
    if (variant === 'shiny' && !shinyRegistered) return;
    setVisualVariant(variant);
    setArtworkReadyKey(null);
    setModelReady(false);
    if (variant === 'shiny' && visualMode === 'model') {
      setVisualMode('artwork');
    }
  };

  const chooseVisualMode = (mode: VisualMode) => {
    if (mode === 'model') {
      setModelReady(false);
      if (modelCapability === 'failed') {
        setModelRetryNonce((current) => current + 1);
      }
    }
    setVisualMode(mode);
    rememberPokedexVisualPreference(mode === 'model' ? '3d' : '2d');
  };

  useEffect(() => {
    let cancelled = false;

    if (!discovered || !activeRecord.slug) {
      setModelCapability('unsupported');
      return () => {
        cancelled = true;
      };
    }

    setModelReady(false);
    setModelCapability('checking');
    void getPokemon3dCapability({
      dex: validDex,
      species: activeRecord.slug,
      variant: visualVariant,
    }).then((capability) => {
      if (!cancelled) setModelCapability(capability.status);
    });

    return () => {
      cancelled = true;
    };
  }, [activeRecord.slug, discovered, modelRetryNonce, validDex, visualVariant]);

  useEffect(() => {
    if (modelCapability === 'ready' && discovered && activeRecord.slug) {
      void warmSpecies3d(activeRecord.slug);
    }
  }, [activeRecord.slug, discovered, modelCapability]);

  useEffect(() => {
    const controller = new AbortController();
    setArtworkReadyKey(null);
    setVisualVariant('regular');
    setModelReady(false);
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
          evolutionTree: payload.evolutionTree,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn(`National Dex record ${validDex} unavailable`, error);
        setRecord((current) =>
          current.dex === validDex ? { ...current, status: 'failed' } : current,
        );
      }
    }

    void loadRecord();
    return () => controller.abort();
  }, [discovered, playerState, review, validDex]);

  if (pokedexState.status !== 'authenticated') {
    return <PortalStateMessage status={pokedexState.status} />;
  }

  const previousDex = validDex > 1 ? validDex - 1 : null;
  const nextDex = validDex < TOTAL ? validDex + 1 : null;
  const region = regionForDex(validDex);
  const displayName = discovered ? activeRecord.name : 'Registro não identificado';
  const description = !discovered
    ? 'Esta espécie ainda não foi registrada na sua jornada.'
    : review?.description
      ? review.description
      : 'Identificação confirmada na sua Pokédex.';
  const varietiesValue =
    activeRecord.status === 'loading'
      ? 'Carregando'
      : activeRecord.varieties.length > 0
        ? `${activeRecord.varieties.length} registro${activeRecord.varieties.length === 1 ? '' : 's'}`
        : 'Forma base';
  const evolutionValue =
    activeRecord.status === 'loading'
      ? 'Carregando'
      : activeRecord.evolutionTree
        ? 'Disponível'
        : 'Sem evolução catalogada';

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
              <fieldset
                className="pokedex-species-variant-modes"
                style={FIELDSET_RESET}
                aria-label="Variante visual da espécie"
              >
                <button
                  type="button"
                  className={visualVariant === 'regular' ? 'is-active' : undefined}
                  aria-pressed={visualVariant === 'regular'}
                  onClick={() => chooseVisualVariant('regular')}
                >
                  NORMAL
                </button>
                <button
                  type="button"
                  className={visualVariant === 'shiny' ? 'is-active' : undefined}
                  aria-pressed={visualVariant === 'shiny'}
                  disabled={!shinyRegistered}
                  title={
                    playerState.shinyHistoryAvailable
                      ? 'Variante shiny ainda não registrada'
                      : 'Histórico shiny ainda não disponível nesta versão do Hub'
                  }
                  onClick={() => chooseVisualVariant('shiny')}
                >
                  ✦ SHINY
                </button>
              </fieldset>
            )}

            {discovered && (
              <fieldset
                className="pokedex-species-view-modes"
                style={FIELDSET_RESET}
                aria-label="Modo de visualização da espécie"
              >
                <button
                  type="button"
                  className={visualMode === 'artwork' ? 'is-active' : undefined}
                  aria-pressed={visualMode === 'artwork'}
                  onClick={() => chooseVisualMode('artwork')}
                >
                  2D
                </button>
                <button
                  type="button"
                  className={visualMode === 'model' ? 'is-active' : undefined}
                  aria-pressed={visualMode === 'model'}
                  disabled={modelCapability === 'unsupported'}
                  onClick={() => chooseVisualMode('model')}
                >
                  3D
                </button>
              </fieldset>
            )}

            {discovered && (
              <div
                className={`pokedex-species-artwork-slot${artworkReady ? ' is-ready' : ''}${showing3d ? ' is-hidden' : ''}`}
              >
                <SpeciesPokemonImage
                  key={artworkKey}
                  dex={validDex}
                  assetRole="official-artwork"
                  variant={visualVariant}
                  className="pokedex-species-artwork"
                  alt={`Ilustração de ${displayName}`}
                  decoding="async"
                  fetchPriority="high"
                  fallbackLabel="?"
                  onResolved={() => setArtworkReadyKey(artworkKey)}
                />
              </div>
            )}

            {modelCanRender && (
              <div
                className={`pokedex-species-model-slot${modelReady ? ' is-ready' : ''}`}
                aria-busy={!modelReady}
              >
                <GenerationsPokemonViewer
                  key={`${validDex}-${activeRecord.slug}-${visualVariant}`}
                  species={activeRecord.slug}
                  name={displayName}
                  onReadyChange={setModelReady}
                  onFailedSpeciesChange={() => {
                    setModelReady(false);
                    setModelCapability('failed');
                  }}
                />
                <span className="pokedex-species-model-hint">ARRASTE PARA GIRAR · PINÇA PARA ZOOM</span>
              </div>
            )}

            {(waitingFor3d || modelUnavailable || modelFailed) && (
              <div className="pokedex-species-model-loading" role="status">
                <span>
                  {modelFailed
                    ? 'NÃO FOI POSSÍVEL ABRIR O MODELO 3D'
                    : modelUnavailable
                      ? 'MODELO 3D INDISPONÍVEL'
                      : 'PREPARANDO MODELO 3D'}
                </span>
                {(modelUnavailable || modelFailed) && (
                  <div className="pokedex-species-model-actions">
                    {modelFailed ? (
                      <button
                        type="button"
                        onClick={() => setModelRetryNonce((current) => current + 1)}
                      >
                        TENTAR NOVAMENTE
                      </button>
                    ) : null}
                    <button type="button" onClick={() => chooseVisualMode('artwork')}>
                      VER 2D
                    </button>
                  </div>
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
              ) : (
                <span className="is-placeholder" aria-hidden="true" />
              )}
              {nextDex ? (
                <a
                  className="is-next"
                  href={neighbourHref(nextDex)}
                  aria-label={`Abrir próxima espécie, número ${String(nextDex).padStart(3, '0')}`}
                >
                  <SideArrow direction="right" />
                </a>
              ) : (
                <span className="is-placeholder" aria-hidden="true" />
              )}
            </nav>
          </div>

          <div className="pokedex-species-identity">
            <span className="pokedex-species-number">
              Nº {String(validDex).padStart(3, '0')}
              {visualVariant === 'shiny' ? ' · VARIANTE SHINY' : ''}
            </span>
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
            <strong className={`is-${playerState.discovery}`}>
              {DISCOVERY_LABELS[playerState.discovery]}
            </strong>
            <span>
              {playerState.seenCount} avistamento{playerState.seenCount === '1' ? '' : 's'}
            </span>
            <span>
              {playerState.caughtCount} captura{playerState.caughtCount === '1' ? '' : 's'}
            </span>
          </div>

          <p className="pokedex-species-description">{description}</p>

          {discovered && (
            <dl className="pokedex-species-facts">
              <div><dt>REGIÃO</dt><dd>{region}</dd></div>
              <div><dt>ALTURA</dt><dd>{activeRecord.height}</dd></div>
              <div><dt>PESO</dt><dd>{activeRecord.weight}</dd></div>
            </dl>
          )}

          <section className="pokedex-species-research-list" aria-label="Registro da espécie">
            {discovered ? (
              <>
                <ResearchRow label="PRIMEIRO AVISTAMENTO" value={formatTimestamp(playerState.firstSeenAt)} tone="ready" />
                <ResearchRow label="ÚLTIMO AVISTAMENTO" value={formatTimestamp(playerState.lastSeenAt)} tone="ready" />
                {playerState.discovery === 'caught' ? (
                  <>
                    <ResearchRow label="PRIMEIRA CAPTURA" value={formatTimestamp(playerState.firstCaughtAt)} tone="ready" />
                    <ResearchRow label="ÚLTIMA CAPTURA" value={formatTimestamp(playerState.lastCaughtAt)} tone="ready" />
                  </>
                ) : null}
                <ResearchRow label="HABITAT" value={activeRecord.habitat} tone="ready" />
                <ResearchRow label="FORMAS / VARIEDADES" value={varietiesValue} tone="ready" />
                <ResearchRow label="LINHA EVOLUTIVA" value={evolutionValue} tone="ready" />
                <ResearchRow
                  label="VARIANTE SHINY"
                  value={
                    !playerState.shinyHistoryAvailable
                      ? 'Histórico indisponível'
                      : shinyRegistered
                        ? `Registrado · ${playerState.shinySeenCount} avist. · ${playerState.shinyCaughtCount} capt.`
                        : 'Não registrado'
                  }
                  tone={shinyRegistered ? 'ready' : 'neutral'}
                />

                {ownedCount !== null ? (
                  ownedCount > 0 ? (
                    <a className="pokedex-species-owned-link" href={`/pokemon?species=${validDex}`}>
                      <span>MEUS POKÉMON DESTA ESPÉCIE</span>
                      <strong>{ownedCount} registro{ownedCount === 1 ? '' : 's'} →</strong>
                    </a>
                  ) : (
                    <div className="pokedex-species-owned-link is-empty" aria-disabled="true">
                      <span>MEUS POKÉMON DESTA ESPÉCIE</span>
                      <strong>0 registros</strong>
                    </div>
                  )
                ) : null}
              </>
            ) : (
              <ResearchRow label="REGISTRO DE JORNADA" value="Ainda não encontrado" tone="locked" />
            )}
          </section>

          {discovered && activeRecord.varieties.length > 1 && (
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

          {discovered && (
            <section className="pokedex-species-evolution" aria-label="Linha evolutiva">
              <header>LINHA EVOLUTIVA</header>
              {activeRecord.evolutionTree ? (
                <EvolutionTree tree={activeRecord.evolutionTree} />
              ) : (
                <p>Sem evolução catalogada.</p>
              )}
            </section>
          )}
        </section>
      </section>
    </main>
  );
}
