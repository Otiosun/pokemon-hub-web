import { useEffect, useMemo, useRef, useState } from 'react';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { TypeIcon } from '../../visual-assets/TypeIcon';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import {
  getCachedNationalDexCatalog,
  loadNationalDexCatalog,
  type NationalDexSpeciesItem,
} from './nationalDexRuntime';
import {
  readPokedexIndexSession,
  rememberPokedexIndexFilters,
  rememberPokedexIndexScroll,
  type PokedexDiscoveryFilter,
  type PokedexRegionFilter,
} from './pokedexIndexSession';
import { getSpeciesPlayerStatePreview } from './speciesPlayerStatePreview';
import {
  getCachedTypeMembers,
  loadTypeMembers,
  POKEDEX_TYPE_FILTERS,
} from './pokedexTypeFilter';
import './pokedex-index.css';

const SKELETON_KEYS = [
  'dex-skeleton-01', 'dex-skeleton-02', 'dex-skeleton-03', 'dex-skeleton-04',
  'dex-skeleton-05', 'dex-skeleton-06', 'dex-skeleton-07', 'dex-skeleton-08',
  'dex-skeleton-09', 'dex-skeleton-10', 'dex-skeleton-11', 'dex-skeleton-12',
] as const;
const DISCOVERY_FILTERS: readonly PokedexDiscoveryFilter[] = ['Todos', 'Avistados', 'Capturados', 'Desconhecidos'];

type TypeFilterStatus = 'idle' | 'loading' | 'ready' | 'failed';

function regionForDex(dex: number): Exclude<PokedexRegionFilter, 'Todos'> {
  if (dex <= 151) return 'Kanto';
  if (dex <= 251) return 'Johto';
  return 'Hoenn';
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function Lens() {
  return <span className="pokedex-index-lens" aria-hidden="true" />;
}

function CatalogSkeleton() {
  return (
    <div className="pokedex-index-grid is-loading" aria-hidden="true">
      {SKELETON_KEYS.map((key) => (
        <div className="pokedex-index-card is-skeleton" key={key}>
          <div className="pokedex-index-card-top"><span /></div>
          <div className="pokedex-index-sprite-wrap" />
          <div className="pokedex-index-card-copy"><strong /><small /></div>
        </div>
      ))}
    </div>
  );
}

function matchesDiscoveryFilter(filter: PokedexDiscoveryFilter, discovery: 'unknown' | 'seen' | 'caught') {
  if (filter === 'Todos') return true;
  if (filter === 'Avistados') return discovery === 'seen';
  if (filter === 'Capturados') return discovery === 'caught';
  return discovery === 'unknown';
}

function discoveryLabel(discovery: 'unknown' | 'seen' | 'caught') {
  if (discovery === 'caught') return 'CAPTURADO';
  if (discovery === 'seen') return 'AVISTADO';
  return 'DESCONHECIDO';
}

export function PokedexIndexPage() {
  const initialSession = useMemo(readPokedexIndexSession, []);
  const cachedCatalog = getCachedNationalDexCatalog();
  const initialTypeMembers = initialSession.typeSlug
    ? getCachedTypeMembers(initialSession.typeSlug)
    : null;
  const [species, setSpecies] = useState<NationalDexSpeciesItem[]>(cachedCatalog ?? []);
  const [query, setQuery] = useState(initialSession.query);
  const [region, setRegion] = useState<PokedexRegionFilter>(initialSession.region);
  const [discovery, setDiscovery] = useState<PokedexDiscoveryFilter>(initialSession.discovery);
  const [typeSlug, setTypeSlug] = useState<string | null>(initialSession.typeSlug);
  const [typeMembers, setTypeMembers] = useState<ReadonlySet<number> | null>(initialTypeMembers);
  const [typeStatus, setTypeStatus] = useState<TypeFilterStatus>(
    initialSession.typeSlug ? (initialTypeMembers ? 'ready' : 'loading') : 'idle',
  );
  const [catalogReady, setCatalogReady] = useState(Boolean(cachedCatalog));
  const [catalogFailed, setCatalogFailed] = useState(false);
  const restoredScroll = useRef(false);

  useEffect(() => {
    let active = true;
    void loadNationalDexCatalog()
      .then((catalog) => {
        if (!active) return;
        setSpecies(catalog);
        setCatalogReady(true);
      })
      .catch((error) => {
        if (!active) return;
        console.warn('National Dex names unavailable', error);
        setCatalogFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!typeSlug) {
      setTypeMembers(null);
      setTypeStatus('idle');
      return;
    }

    const cached = getCachedTypeMembers(typeSlug);
    if (cached) {
      setTypeMembers(cached);
      setTypeStatus('ready');
      return;
    }

    let active = true;
    setTypeStatus('loading');
    void loadTypeMembers(typeSlug)
      .then((members) => {
        if (!active) return;
        setTypeMembers(members);
        setTypeStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        console.warn(`National Dex type filter ${typeSlug} unavailable`, error);
        setTypeMembers(new Set());
        setTypeStatus('failed');
      });
    return () => {
      active = false;
    };
  }, [typeSlug]);

  useEffect(() => {
    rememberPokedexIndexFilters(query, region, discovery, typeSlug);
  }, [discovery, query, region, typeSlug]);

  useEffect(() => {
    if (!catalogReady || restoredScroll.current) return;
    restoredScroll.current = true;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: initialSession.scrollY, behavior: 'auto' });
    });
    return () => cancelAnimationFrame(frame);
  }, [catalogReady, initialSession.scrollY]);

  useEffect(() => {
    return () => {
      rememberPokedexIndexScroll(window.scrollY);
    };
  }, []);

  const visibleSpecies = useMemo(() => {
    const needle = normalize(query.replace(/^#/, ''));
    return species.filter((item) => {
      const playerState = getSpeciesPlayerStatePreview(item.dex);
      const paddedDex = String(item.dex).padStart(3, '0');
      if (region !== 'Todos' && regionForDex(item.dex) !== region) return false;
      if (!matchesDiscoveryFilter(discovery, playerState.discovery)) return false;
      if (typeSlug && typeStatus !== 'loading') {
        if (playerState.discovery === 'unknown') return false;
        if (!typeMembers || !typeMembers.has(item.dex)) return false;
      }
      if (!needle) return true;
      if (paddedDex.includes(needle) || String(item.dex) === needle) return true;
      if (playerState.discovery === 'unknown') return false;
      return normalize(item.name).includes(needle);
    });
  }, [discovery, query, region, species, typeMembers, typeSlug, typeStatus]);

  const dexProgress = useMemo(() => {
    let seen = 0;
    let caught = 0;
    for (const item of species) {
      const state = getSpeciesPlayerStatePreview(item.dex);
      if (state.discovery !== 'unknown') seen += 1;
      if (state.discovery === 'caught') caught += 1;
    }
    return { seen, caught };
  }, [species]);

  const activeType = typeSlug
    ? POKEDEX_TYPE_FILTERS.find((item) => item.slug === typeSlug) ?? null
    : null;
  const typeLoading = Boolean(typeSlug && typeStatus === 'loading');

  const chooseDiscovery = (nextDiscovery: PokedexDiscoveryFilter) => {
    setDiscovery(nextDiscovery);
    if (nextDiscovery === 'Desconhecidos') setTypeSlug(null);
  };

  const chooseType = (nextTypeSlug: string) => {
    const selected = typeSlug === nextTypeSlug;
    setTypeSlug(selected ? null : nextTypeSlug);
    if (!selected && discovery === 'Desconhecidos') setDiscovery('Todos');
  };

  return (
    <main className="pokedex-index-page">
      <header className="pokedex-index-header">
        <a className="pokedex-index-brand" href="/pokedex" aria-label="Índice Nacional da Pokédex">
          <Lens />
          <span>
            <strong>FIELD DEX</strong>
            <small>ÍNDICE NACIONAL</small>
          </span>
        </a>
        <div className="pokedex-index-counter">
          <small>ARQUIVOS</small>
          <strong>001—386</strong>
        </div>
      </header>

      <section className="pokedex-index-shell" aria-label="Índice Nacional da Pokédex">
        <div className="pokedex-index-intro">
          <div>
            <span className="pokedex-index-kicker">ARQUIVO DE ESPÉCIES</span>
            <h1>Índice Nacional</h1>
            <p>Espécies conhecidas, avistamentos e registros de captura entre Kanto, Johto e Hoenn.</p>
          </div>
          <div className="pokedex-index-progress-readout" aria-live="polite">
            <div><span>{catalogReady ? visibleSpecies.length : '—'}</span><small>RESULTADOS</small></div>
            <div><span>{catalogReady ? dexProgress.seen : '—'}</span><small>AVISTADOS</small></div>
            <div><span>{catalogReady ? dexProgress.caught : '—'}</span><small>CAPTURADOS</small></div>
          </div>
        </div>

        <div className="pokedex-index-toolbar">
          <label className="pokedex-index-search">
            <span>BUSCAR</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome ou número"
              inputMode="search"
              disabled={!catalogReady}
            />
          </label>
          <fieldset className="pokedex-index-regions" aria-label="Filtrar por região" disabled={!catalogReady}>
            {(['Todos', 'Kanto', 'Johto', 'Hoenn'] as PokedexRegionFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                className={region === item ? 'is-active' : undefined}
                onClick={() => setRegion(item)}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </fieldset>
        </div>

        <div className="pokedex-index-discovery-filter">
          <span>PROGRESSO</span>
          <fieldset aria-label="Filtrar a Pokédex por progresso de descoberta">
            {DISCOVERY_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={discovery === item ? 'is-active' : undefined}
                aria-pressed={discovery === item}
                onClick={() => chooseDiscovery(item)}
                disabled={!catalogReady}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </fieldset>
        </div>

        <div className="pokedex-index-type-filter">
          <span className="pokedex-index-type-label">TIPO</span>
          <fieldset className="pokedex-index-type-scroll" aria-label="Filtrar a Pokédex por tipo">
            <button
              type="button"
              className={!typeSlug ? 'is-active is-all' : 'is-all'}
              onClick={() => setTypeSlug(null)}
              disabled={!catalogReady}
            >
              TODOS
            </button>
            {POKEDEX_TYPE_FILTERS.map((item) => {
              const selected = typeSlug === item.slug;
              const accent = typeAccent(item.label);
              return (
                <button
                  key={item.slug}
                  type="button"
                  className={selected ? 'is-active' : undefined}
                  onClick={() => chooseType(item.slug)}
                  disabled={!catalogReady}
                  aria-pressed={selected}
                  style={selected ? { borderColor: `${accent}99`, background: `${accent}1f` } : undefined}
                >
                  <TypeIcon type={item.label} fallbackColor={accent} />
                  <span>{item.label.toUpperCase()}</span>
                </button>
              );
            })}
          </fieldset>
        </div>

        <div className="pokedex-index-status">
          <span
            className={catalogReady && typeStatus !== 'failed' ? 'is-ready' : catalogFailed || typeStatus === 'failed' ? 'is-failed' : undefined}
            aria-hidden="true"
          />
          {catalogFailed
            ? 'CATÁLOGO LOCAL ATIVO · ENRIQUECIMENTO EXTERNO INDISPONÍVEL'
            : typeStatus === 'failed'
              ? `FILTRO ${activeType?.label.toUpperCase() ?? ''} INDISPONÍVEL`
              : typeLoading
                ? `LENDO REGISTROS DO TIPO ${activeType?.label.toUpperCase() ?? ''}`
                : catalogReady
                  ? 'ÍNDICE LOCAL ATIVO · 386 POSIÇÕES DISPONÍVEIS'
                  : 'PREPARANDO ÍNDICE NACIONAL'}
        </div>

        {!catalogReady ? (
          <CatalogSkeleton />
        ) : visibleSpecies.length === 0 ? (
          <div className="pokedex-index-empty">
            <strong>NENHUM REGISTRO NESTA LEITURA</strong>
            <span>Ajuste busca, região, progresso ou tipo.</span>
          </div>
        ) : (
          <div className={`pokedex-index-grid${typeLoading ? ' is-filtering' : ''}`}>
            {visibleSpecies.map((item) => {
              const playerState = getSpeciesPlayerStatePreview(item.dex);
              const discovered = playerState.discovery !== 'unknown';
              const paddedDex = String(item.dex).padStart(3, '0');
              const displayName = discovered ? item.name || `#${paddedDex}` : '???';
              const shinyClass = playerState.shinySeen ? ' is-shiny-seen' : '';
              return (
                <a
                  className={`pokedex-index-card is-${playerState.discovery}${shinyClass}`}
                  key={item.dex}
                  href={`/pokedex/${paddedDex}`}
                  aria-label={discovered ? `Abrir registro de ${displayName}, número ${item.dex}` : `Abrir registro desconhecido número ${item.dex}`}
                >
                  <div className="pokedex-index-card-top">
                    <span>#{paddedDex}</span>
                    <span className="pokedex-index-state-group">
                      {playerState.shinySeen ? <i className="pokedex-index-shiny-mark" role="img" aria-label="Shiny registrado">✦</i> : null}
                      <strong className="pokedex-index-discovery-state">{discoveryLabel(playerState.discovery)}</strong>
                    </span>
                  </div>
                  <div className="pokedex-index-sprite-wrap">
                    {discovered ? (
                      <PokemonAssetImage
                        dex={item.dex}
                        assetRole="official-artwork"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        fallbackLabel="?"
                      />
                    ) : (
                      <span className="pokedex-index-unknown-glyph" aria-hidden="true">?</span>
                    )}
                  </div>
                  <div className="pokedex-index-card-copy">
                    <strong>{displayName}</strong>
                    <small>
                      {regionForDex(item.dex).toUpperCase()}
                      {discovered ? ` · PESQ ${playerState.researchLevel}/5` : ' · SEM DADOS'}
                    </small>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
