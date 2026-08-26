import { useEffect, useMemo, useRef, useState } from 'react';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { getPokemonSpeciesVisualAssets } from '../../visual-assets/pokemonVisualRegistry';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import {
  readCollectionSession,
  rememberCollectionFilters,
  rememberCollectionScroll,
  type CollectionMode,
} from './collectionSession';
import { OWNED_POKEMON_PREVIEW, type OwnedPokemonPreview } from './ownedPokemonPreview';
import './owned-pokemon-collection.css';

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

function PokemonCard({ pokemon }: { pokemon: OwnedPokemonPreview }) {
  const visual = getPokemonSpeciesVisualAssets(pokemon.dex);
  return (
    <article className={`owned-pokemon-card${pokemon.teamSlot ? ' is-in-team' : ''}${pokemon.shiny ? ' is-shiny' : ''}`}>
      <div className="owned-pokemon-card-top">
        <span>#{String(pokemon.dex).padStart(3, '0')}</span>
        <div>
          {pokemon.favorite && <span className="owned-pokemon-favorite" title="Favorito" aria-hidden="true">★</span>}
          {pokemon.teamSlot && <strong>TIME · {pokemon.teamSlot}</strong>}
        </div>
      </div>
      <div className="owned-pokemon-visual">
        <img
          src={visual.icon}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={(event) => { event.currentTarget.hidden = true; }}
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
          <span>{pokemon.box.toUpperCase()}</span>
          {pokemon.shiny && <strong>SHINY</strong>}
        </div>
      </div>
    </article>
  );
}

export function OwnedPokemonCollectionPage() {
  const initial = useMemo(readCollectionSession, []);
  const [mode, setMode] = useState<CollectionMode>(initial.mode);
  const [query, setQuery] = useState(initial.query);
  const [speciesContextDex, setSpeciesContextDex] = useState(readSpeciesContextFilter);
  const restoredScroll = useRef(false);

  useEffect(() => {
    rememberCollectionFilters(mode, query);
  }, [mode, query]);

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
    return OWNED_POKEMON_PREVIEW.filter((pokemon) => {
      if (speciesContextDex && pokemon.dex !== speciesContextDex) return false;
      if (mode === 'favorites' && !pokemon.favorite) return false;
      if (!needle) return true;
      return normalize(pokemon.nickname).includes(needle) || normalize(pokemon.species).includes(needle);
    });
  }, [mode, query, speciesContextDex]);

  const boxes = useMemo(() => {
    const grouped = new Map<string, OwnedPokemonPreview[]>();
    for (const pokemon of visible) {
      const list = grouped.get(pokemon.box) ?? [];
      list.push(pokemon);
      grouped.set(pokemon.box, list);
    }
    return [...grouped.entries()];
  }, [visible]);

  const teamCount = OWNED_POKEMON_PREVIEW.filter((pokemon) => pokemon.teamSlot !== null).length;
  const favoriteCount = OWNED_POKEMON_PREVIEW.filter((pokemon) => pokemon.favorite).length;
  const contextualSpecies = speciesContextDex
    ? OWNED_POKEMON_PREVIEW.find((pokemon) => pokemon.dex === speciesContextDex)?.species ?? `#${String(speciesContextDex).padStart(3, '0')}`
    : null;

  const clearSpeciesContext = () => {
    setSpeciesContextDex(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('species');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <main className="owned-pokemon-page">
      <header className="owned-pokemon-header">
        <div>
          <span className="owned-pokemon-kicker">COLEÇÃO DO TREINADOR</span>
          <h1>Meus Pokémon</h1>
          <p>Todos os Pokémon pertencentes ao jogador continuam visíveis aqui, inclusive os seis ativos no Time.</p>
        </div>
        <div className="owned-pokemon-summary">
          <div><strong>{OWNED_POKEMON_PREVIEW.length}</strong><span>POKÉMON</span></div>
          <div><strong>{teamCount}</strong><span>NO TIME</span></div>
          <div><strong>{favoriteCount}</strong><span>FAVORITOS</span></div>
        </div>
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

      <div className="owned-pokemon-runtime-note">
        <span aria-hidden="true" /> DADOS DE ESTRUTURA · INTEGRAÇÃO COM O RPG PENDENTE
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
          <span>Ajuste a busca ou o modo da coleção.</span>
        </div>
      )}
    </main>
  );
}
