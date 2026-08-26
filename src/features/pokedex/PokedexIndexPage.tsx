import { useEffect, useMemo, useState } from 'react';
import {
  FIELD_DEX_REVIEW_SPECIES,
  getFieldDexVisual,
} from '../pokemon-detail/fieldDexSpecies';
import './pokedex-index.css';

type RegionFilter = 'Todos' | 'Kanto' | 'Johto' | 'Hoenn';
type SpeciesItem = { dex: number; name: string };
type PokeApiResponse = { results?: Array<{ name?: string }> };

const TOTAL = 386;
const REVIEW_BY_DEX = new Map(FIELD_DEX_REVIEW_SPECIES.map((species) => [species.dex, species]));
const BASE_ITEMS: SpeciesItem[] = Array.from({ length: TOTAL }, (_, index) => ({
  dex: index + 1,
  name: `Espécie ${String(index + 1).padStart(3, '0')}`,
}));

function regionForDex(dex: number): Exclude<RegionFilter, 'Todos'> {
  if (dex <= 151) return 'Kanto';
  if (dex <= 251) return 'Johto';
  return 'Hoenn';
}

function formatSpeciesName(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

export function PokedexIndexPage() {
  const [species, setSpecies] = useState<SpeciesItem[]>(BASE_ITEMS);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<RegionFilter>('Todos');
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadNames() {
      try {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=386&offset=0', {
          signal: controller.signal,
          cache: 'force-cache',
        });
        if (!response.ok) return;
        const payload = (await response.json()) as PokeApiResponse;
        const results = payload.results ?? [];
        setSpecies(
          BASE_ITEMS.map((item, index) => {
            const rawName = results[index]?.name;
            return rawName ? { ...item, name: formatSpeciesName(rawName) } : item;
          }),
        );
        setCatalogReady(true);
      } catch (error) {
        if (!controller.signal.aborted) console.warn('National Dex names unavailable', error);
      }
    }

    void loadNames();
    return () => controller.abort();
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
            <span>{visibleSpecies.length}</span>
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
            />
          </label>
          <div className="pokedex-index-regions" role="group" aria-label="Filtrar por região">
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
          </div>
        </div>

        <div className="pokedex-index-status">
          <span className={catalogReady ? 'is-ready' : undefined} aria-hidden="true" />
          {catalogReady ? 'CATÁLOGO SINCRONIZADO' : 'CARREGANDO NOMES · O ÍNDICE NUMÉRICO JÁ ESTÁ DISPONÍVEL'}
        </div>

        <div className="pokedex-index-grid">
          {visibleSpecies.map((item) => {
            const review = REVIEW_BY_DEX.get(item.dex);
            const visual = getFieldDexVisual(item.dex);
            const body = (
              <>
                <div className="pokedex-index-card-top">
                  <span>#{String(item.dex).padStart(3, '0')}</span>
                  {review && <strong>INSPECIONAR</strong>}
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
              </>
            );

            if (review) {
              return (
                <a
                  className="pokedex-index-card is-available"
                  key={item.dex}
                  href={`/pokemon/${review.routeSlug}`}
                  aria-label={`Abrir registro de ${item.name}, número ${item.dex}`}
                >
                  {body}
                </a>
              );
            }

            return (
              <article
                className="pokedex-index-card"
                key={item.dex}
                aria-label={`${item.name}, número ${item.dex}; registro detalhado ainda não carregado nesta versão`}
              >
                {body}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
