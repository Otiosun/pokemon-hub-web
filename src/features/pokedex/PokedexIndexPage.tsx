import { useEffect, useMemo, useState } from 'react';
import {
  FIELD_DEX_REVIEW_SPECIES,
  getFieldDexVisual,
} from '../pokemon-detail/fieldDexSpecies';
import {
  getCachedNationalDexCatalog,
  loadNationalDexCatalog,
  type NationalDexSpeciesItem,
} from './nationalDexRuntime';
import './pokedex-index.css';

type RegionFilter = 'Todos' | 'Kanto' | 'Johto' | 'Hoenn';

const REVIEW_BY_DEX = new Map(FIELD_DEX_REVIEW_SPECIES.map((species) => [species.dex, species]));
const SKELETON_KEYS = [
  'dex-skeleton-01', 'dex-skeleton-02', 'dex-skeleton-03', 'dex-skeleton-04',
  'dex-skeleton-05', 'dex-skeleton-06', 'dex-skeleton-07', 'dex-skeleton-08',
  'dex-skeleton-09', 'dex-skeleton-10', 'dex-skeleton-11', 'dex-skeleton-12',
] as const;

function regionForDex(dex: number): Exclude<RegionFilter, 'Todos'> {
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

export function PokedexIndexPage() {
  const cachedCatalog = getCachedNationalDexCatalog();
  const [species, setSpecies] = useState<NationalDexSpeciesItem[]>(cachedCatalog ?? []);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<RegionFilter>('Todos');
  const [catalogReady, setCatalogReady] = useState(Boolean(cachedCatalog));
  const [catalogFailed, setCatalogFailed] = useState(false);

  useEffect(() => {
    if (getCachedNationalDexCatalog()) return;
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

  const visibleSpecies = useMemo(() => {
    const needle = normalize(query.replace(/^#/, ''));
    return species.filter((item) => {
      if (region !== 'Todos' && regionForDex(item.dex) !== region) return false;
      if (!needle) return true;
      const paddedDex = String(item.dex).padStart(3, '0');
      return normalize(item.name).includes(needle) || paddedDex.includes(needle) || String(item.dex) === needle;
    });
  }, [query, region, species]);

  return (
    <main className="pokedex-index-page">
      <header className="pokedex-index-header">
        <a className="pokedex-index-brand" href="/" aria-label="Voltar ao Pokémon Hub">
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
            <p>Consulta rápida das espécies registradas entre Kanto, Johto e Hoenn.</p>
          </div>
          <div className="pokedex-index-readout" aria-live="polite">
            <span>{catalogReady ? visibleSpecies.length : '—'}</span>
            <small>RESULTADOS</small>
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
            {(['Todos', 'Kanto', 'Johto', 'Hoenn'] as RegionFilter[]).map((item) => (
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

        <div className="pokedex-index-status">
          <span className={catalogReady ? 'is-ready' : catalogFailed ? 'is-failed' : undefined} aria-hidden="true" />
          {catalogReady
            ? '386 REGISTROS DISPONÍVEIS'
            : catalogFailed
              ? 'CATÁLOGO INDISPONÍVEL · TENTE NOVAMENTE MAIS TARDE'
              : 'CARREGANDO CATÁLOGO NACIONAL'}
        </div>

        {!catalogReady ? (
          <CatalogSkeleton />
        ) : (
          <div className="pokedex-index-grid">
            {visibleSpecies.map((item) => {
              const review = REVIEW_BY_DEX.get(item.dex);
              const visual = getFieldDexVisual(item.dex);
              const paddedDex = String(item.dex).padStart(3, '0');
              return (
                <a
                  className={`pokedex-index-card${review ? ' is-available' : ''}`}
                  key={item.dex}
                  href={`/pokedex/${paddedDex}`}
                  aria-label={`Abrir registro de ${item.name}, número ${item.dex}`}
                >
                  <div className="pokedex-index-card-top">
                    <span>#{paddedDex}</span>
                    {review && <strong>3D DISPONÍVEL</strong>}
                  </div>
                  <div className="pokedex-index-sprite-wrap">
                    <img
                      src={visual.icon}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      onError={(event) => { event.currentTarget.hidden = true; }}
                    />
                  </div>
                  <div className="pokedex-index-card-copy">
                    <strong>{item.name}</strong>
                    <small>{regionForDex(item.dex).toUpperCase()}</small>
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
