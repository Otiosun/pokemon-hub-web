import { useEffect, useMemo, useRef, useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { rememberHubDestination } from '../../navigation/hubNavigationSession';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { TypeIcon } from '../../visual-assets/TypeIcon';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import { POKEDEX_TYPE_FILTERS } from '../pokedex/pokedexTypeFilter';
import {
  applyCollectionFilters,
  countCollectionFilters,
  DEFAULT_COLLECTION_FILTERS,
  type CollectionFilterState,
  type CollectionLevelFilter,
  type CollectionPresenceFilter,
  type CollectionSexFilter,
  type CollectionShinyFilter,
  type CollectionSort,
} from './collectionFilters';
import {
  readCollectionSession,
  rememberCollectionFilters,
  rememberCollectionScroll,
  type CollectionMode,
} from './collectionSession';
import { getTeamPreview, OWNED_POKEMON_PREVIEW, type OwnedPokemonPreview } from './ownedPokemonPreview';
import './owned-pokemon-collection.css';
import './owned-pokemon-filters.css';
import './owned-pokemon-collection-v2.css';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function readSpeciesContextFilter() {
  const raw = new URLSearchParams(window.location.search).get('species');
  if (!raw) return null;
  const dex = Number.parseInt(raw, 10);
  return Number.isInteger(dex) && dex >= 1 && dex <= 386 ? dex : null;
}

function sexSymbol(pokemon: OwnedPokemonPreview) {
  if (pokemon.sex === 'M') return { glyph: '♂', label: 'Macho' };
  if (pokemon.sex === 'F') return { glyph: '♀', label: 'Fêmea' };
  return { glyph: '—', label: 'Sem sexo registrado' };
}

function TeamPreviewCard({ pokemon }: { pokemon: OwnedPokemonPreview }) {
  return (
    <a
      className={`owned-pokemon-team-card${pokemon.shiny ? ' is-shiny' : ''}`}
      href={`/pokemon/${pokemon.instanceId}`}
      aria-label={`Abrir ${pokemon.nickname}, slot ${pokemon.teamSlot ?? 'sem número'}`}
    >
      <span className="owned-pokemon-team-slot">SLOT {String(pokemon.teamSlot ?? 0).padStart(2, '0')}</span>
      <div className="owned-pokemon-team-portrait">
        <PokemonAssetImage
          dex={pokemon.dex}
          assetRole="portrait"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          fallbackLabel="?"
        />
      </div>
      <div className="owned-pokemon-team-copy">
        <strong>{pokemon.nickname}</strong>
        <span>{pokemon.species} · NV. {pokemon.level}</span>
      </div>
      {pokemon.favorite ? <span className="owned-pokemon-team-favorite" aria-hidden="true">★</span> : null}
    </a>
  );
}

function PokemonCard({ pokemon }: { pokemon: OwnedPokemonPreview }) {
  const sex = sexSymbol(pokemon);
  return (
    <a
      className={`owned-pokemon-card${pokemon.teamSlot ? ' is-in-team' : ''}${pokemon.shiny ? ' is-shiny' : ''}`}
      href={`/pokemon/${pokemon.instanceId}`}
      aria-label={`Abrir ${pokemon.nickname}, ${pokemon.species}, nível ${pokemon.level}, ${sex.label}`}
    >
      <div className="owned-pokemon-card-top">
        <span>#{String(pokemon.dex).padStart(3, '0')}</span>
        <div>
          {pokemon.favorite && <span className="owned-pokemon-favorite" title="Favorito" aria-hidden="true">★</span>}
          {pokemon.teamSlot && <strong>TIME · {pokemon.teamSlot}</strong>}
        </div>
      </div>
      <div className="owned-pokemon-visual">
        <PokemonAssetImage
          dex={pokemon.dex}
          assetRole="home-artwork"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          fallbackLabel="?"
        />
      </div>
      <div className="owned-pokemon-copy">
        <div className="owned-pokemon-name-row">
          <div>
            <strong>{pokemon.nickname}</strong>
            {pokemon.nickname !== pokemon.species && <small>{pokemon.species}</small>}
          </div>
          <span>NV. {pokemon.level}</span>
        </div>
        <div className="owned-pokemon-types">
          {pokemon.types.map((type) => (
            <TypeBadge key={type} type={type} accent={typeAccent(type)} compact />
          ))}
        </div>
        <div className="owned-pokemon-card-foot">
          <span>{pokemon.box.toUpperCase()} · <span role="img" aria-label={sex.label}>{sex.glyph}</span></span>
          {pokemon.shiny && <strong>SHINY</strong>}
        </div>
      </div>
    </a>
  );
}

export function OwnedPokemonCollectionPage() {
  const initial = useMemo(readCollectionSession, []);
  const team = useMemo(getTeamPreview, []);
  const [mode, setMode] = useState<CollectionMode>(initial.mode);
  const [query, setQuery] = useState(initial.query);
  const [filters, setFilters] = useState<CollectionFilterState>(initial.filters);
  const [speciesContextDex, setSpeciesContextDex] = useState(readSpeciesContextFilter);
  const restoredScroll = useRef(false);

  useEffect(() => {
    rememberCollectionFilters(mode, query, filters);
  }, [filters, mode, query]);

  useEffect(() => {
    if (restoredScroll.current) return;
    restoredScroll.current = true;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: speciesContextDex ? 0 : initial.scrollY, behavior: 'auto' });
    });
    return () => cancelAnimationFrame(frame);
  }, [initial.scrollY, speciesContextDex]);

  useEffect(() => {
    return () => rememberCollectionScroll(window.scrollY);
  }, []);

  const visible = useMemo(() => {
    const needle = normalize(query);
    const base = OWNED_POKEMON_PREVIEW.filter((pokemon) => {
      if (speciesContextDex && pokemon.dex !== speciesContextDex) return false;
      if (mode === 'favorites' && !pokemon.favorite) return false;
      if (!needle) return true;
      return normalize(pokemon.nickname).includes(needle) || normalize(pokemon.species).includes(needle);
    });
    return applyCollectionFilters(base, filters);
  }, [filters, mode, query, speciesContextDex]);

  const boxes = useMemo(() => {
    const grouped = new Map<string, OwnedPokemonPreview[]>();
    for (const pokemon of visible) {
      const list = grouped.get(pokemon.box) ?? [];
      list.push(pokemon);
      grouped.set(pokemon.box, list);
    }
    return [...grouped.entries()];
  }, [visible]);

  const favoriteCount = OWNED_POKEMON_PREVIEW.filter((pokemon) => pokemon.favorite).length;
  const activeFilterCount = countCollectionFilters(filters);
  const contextualSpecies = speciesContextDex
    ? OWNED_POKEMON_PREVIEW.find((pokemon) => pokemon.dex === speciesContextDex)?.species ?? `#${String(speciesContextDex).padStart(3, '0')}`
    : null;

  const patchFilters = (patch: Partial<CollectionFilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const clearSpeciesContext = () => {
    setSpeciesContextDex(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('species');
    const nextLocation = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', nextLocation);
    rememberHubDestination('/pokemon');
  };

  return (
    <main className="owned-pokemon-page owned-pokemon-page-v2">
      <HubModuleHeader module="pokemon" metaLabel="BOX" metaValue={`${OWNED_POKEMON_PREVIEW.length} POKÉMON`} />

      <div className="owned-pokemon-page-content">
        <header className="owned-pokemon-header owned-pokemon-header-v2">
          <div>
            <span className="owned-pokemon-kicker">POKÉMON DO TREINADOR</span>
            <h1>Time + Box</h1>
            <p>Seu time atual fica visível primeiro. A coleção completa continua logo abaixo, no mesmo espaço.</p>
          </div>
        </header>

        <section className="owned-pokemon-team-section" aria-labelledby="owned-current-team-title">
          <header className="owned-pokemon-team-head">
            <div>
              <span>TIME ATUAL · {team.length}/6</span>
              <h2 id="owned-current-team-title">Seus parceiros ativos</h2>
            </div>
            <a href="/team">EDITAR TIME <span aria-hidden="true">→</span></a>
          </header>
          <div className="owned-pokemon-team-grid">
            {team.map((pokemon) => <TeamPreviewCard key={pokemon.instanceId} pokemon={pokemon} />)}
          </div>
        </section>

        <section className="owned-pokemon-storage-section" aria-labelledby="owned-box-title">
          <header className="owned-pokemon-storage-head">
            <div>
              <span>BOX</span>
              <h2 id="owned-box-title">Todos os Pokémon</h2>
            </div>
            <p>{OWNED_POKEMON_PREVIEW.length} registrados · {favoriteCount} favoritos</p>
          </header>

          {speciesContextDex && (
            <div className="owned-pokemon-context-filter">
              <div>
                <span>VINDO DA POKÉDEX</span>
                <strong>{contextualSpecies} · #{String(speciesContextDex).padStart(3, '0')}</strong>
              </div>
              <button type="button" onClick={clearSpeciesContext}>VER TODA A COLEÇÃO</button>
            </div>
          )}

          <section className="owned-pokemon-toolbar" aria-label="Ferramentas da coleção">
            <fieldset className="owned-pokemon-modes" aria-label="Modo da coleção">
              {([
                ['all', 'TODOS'],
                ['boxes', 'BOXES'],
                ['favorites', 'FAVORITOS'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={mode === id ? 'is-active' : undefined}
                  aria-pressed={mode === id}
                  onClick={() => setMode(id)}
                >
                  {label}
                </button>
              ))}
            </fieldset>
            <label className="owned-pokemon-search">
              <span>BUSCAR</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nickname ou espécie"
                inputMode="search"
              />
            </label>
          </section>

          <section className="owned-pokemon-filter-shell" aria-label="Filtros e ordenação da coleção">
            <header>
              <span>FILTROS{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}</span>
              {activeFilterCount > 0 && (
                <button type="button" onClick={() => setFilters({ ...DEFAULT_COLLECTION_FILTERS })}>LIMPAR</button>
              )}
            </header>
            <div className="owned-pokemon-filter-strip">
              <label>
                <span className="owned-pokemon-filter-label">
                  {filters.type && <TypeIcon type={filters.type} fallbackColor={typeAccent(filters.type)} />}
                  TIPO
                </span>
                <select value={filters.type ?? ''} onChange={(event) => patchFilters({ type: event.target.value || null })}>
                  <option value="">Todos</option>
                  {POKEDEX_TYPE_FILTERS.map((item) => <option key={item.slug} value={item.label}>{item.label}</option>)}
                </select>
              </label>

              <label>
                <span>NÍVEL</span>
                <select value={filters.level} onChange={(event) => patchFilters({ level: event.target.value as CollectionLevelFilter })}>
                  <option value="all">Todos</option>
                  <option value="1-10">1—10</option>
                  <option value="11-20">11—20</option>
                  <option value="21-30">21—30</option>
                  <option value="31+">31+</option>
                </select>
              </label>

              <label>
                <span>SEXO</span>
                <select value={filters.sex} onChange={(event) => patchFilters({ sex: event.target.value as CollectionSexFilter })}>
                  <option value="all">Todos</option>
                  <option value="M">Macho ♂</option>
                  <option value="F">Fêmea ♀</option>
                  <option value="—">Sem registro</option>
                </select>
              </label>

              <label>
                <span>LOCAL</span>
                <select value={filters.presence} onChange={(event) => patchFilters({ presence: event.target.value as CollectionPresenceFilter })}>
                  <option value="all">Todos</option>
                  <option value="team">No Time</option>
                  <option value="storage">Fora do Time</option>
                </select>
              </label>

              <label>
                <span>SHINY</span>
                <select value={filters.shiny} onChange={(event) => patchFilters({ shiny: event.target.value as CollectionShinyFilter })}>
                  <option value="all">Todos</option>
                  <option value="shiny">Somente shiny</option>
                  <option value="regular">Não shiny</option>
                </select>
              </label>

              <label>
                <span>ORDENAR</span>
                <select value={filters.sort} onChange={(event) => patchFilters({ sort: event.target.value as CollectionSort })}>
                  <option value="dex">Nº da Pokédex</option>
                  <option value="name">Nome A—Z</option>
                  <option value="level-desc">Nível ↓</option>
                  <option value="level-asc">Nível ↑</option>
                </select>
              </label>
            </div>
          </section>

          <div className="owned-pokemon-runtime-note">
            <span aria-hidden="true" /> {visible.length} RESULTADO{visible.length === 1 ? '' : 'S'} · TOQUE EM UM POKÉMON PARA ABRIR A FICHA
          </div>

          {mode === 'boxes' ? (
            <div className="owned-pokemon-boxes">
              {boxes.map(([box, pokemon]) => (
                <section className="owned-pokemon-box" key={box}>
                  <header><strong>{box}</strong><span>{pokemon.length} REGISTROS</span></header>
                  <div className="owned-pokemon-grid">
                    {pokemon.map((item) => <PokemonCard key={item.instanceId} pokemon={item} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="owned-pokemon-grid">
              {visible.map((pokemon) => <PokemonCard key={pokemon.instanceId} pokemon={pokemon} />)}
            </div>
          )}

          {visible.length === 0 && (
            <div className="owned-pokemon-empty">
              <strong>Nenhum Pokémon encontrado.</strong>
              <span>Ajuste a busca ou os filtros da coleção.</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
