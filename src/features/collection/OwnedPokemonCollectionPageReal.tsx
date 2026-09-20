import { useEffect, useMemo, useRef, useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { rememberHubDestination } from '../../navigation/hubNavigationSession';
import { movePlayerPortalPokemon } from '../../player-api/playerPortalRosterClient';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import {
  applyCollectionFilters,
  DEFAULT_COLLECTION_FILTERS,
  type CollectionFilterState,
  type CollectionPresenceFilter,
  type CollectionShinyFilter,
  type CollectionSort,
} from './collectionFilters';
import {
  readCollectionSession,
  rememberCollectionFilters,
  rememberCollectionScroll,
  type CollectionMode,
} from './collectionSession';
import { createOwnedPokemonView, type OwnedPokemonView } from './ownedPokemonView';
import { useOwnedPokemonCollection } from './useOwnedPokemonCollection';
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

function sexSymbol(pokemon: OwnedPokemonView) {
  if (pokemon.sex === 'M') return { glyph: '♂', label: 'Macho' };
  if (pokemon.sex === 'F') return { glyph: '♀', label: 'Fêmea' };
  return { glyph: '—', label: 'Sem sexo registrado' };
}

function PokemonVisual({
  pokemon,
  assetRole,
}: {
  pokemon: OwnedPokemonView;
  assetRole: 'portrait' | 'official-artwork';
}) {
  if (pokemon.dex === null) return <strong aria-hidden="true">?</strong>;
  return (
    <PokemonAssetImage
      dex={pokemon.dex}
      assetRole={assetRole}
      variant={pokemon.shiny ? 'shiny' : 'regular'}
      alt=""
      aria-hidden="true"
      loading={assetRole === 'portrait' ? 'eager' : 'lazy'}
      decoding="async"
      fallbackLabel="?"
    />
  );
}

function TeamCard({ pokemon }: { pokemon: OwnedPokemonView }) {
  return (
    <a
      className={`owned-pokemon-team-card${pokemon.shiny ? ' is-shiny' : ''}`}
      href={`/pokemon/${pokemon.instanceId}`}
      aria-label={`Abrir ${pokemon.nickname}, slot ${pokemon.teamSlot ?? 'sem número'}`}
    >
      <span className="owned-pokemon-team-slot">
        SLOT {String(pokemon.teamSlot ?? 0).padStart(2, '0')}
      </span>
      <div className="owned-pokemon-team-portrait">
        <PokemonVisual pokemon={pokemon} assetRole="portrait" />
      </div>
      <div className="owned-pokemon-team-copy">
        <strong>{pokemon.nickname}</strong>
        <span>
          {pokemon.species} · NV. {pokemon.level} · HP {pokemon.currentHp}
        </span>
      </div>
    </a>
  );
}

function PokemonCard({ pokemon }: { pokemon: OwnedPokemonView }) {
  const sex = sexSymbol(pokemon);
  const dex = pokemon.dex === null ? '---' : String(pokemon.dex).padStart(3, '0');
  return (
    <a
      className={`owned-pokemon-card${pokemon.teamSlot ? ' is-in-team' : ''}${pokemon.shiny ? ' is-shiny' : ''}`}
      href={`/pokemon/${pokemon.instanceId}`}
      aria-label={`Abrir ${pokemon.nickname}, ${pokemon.species}, nível ${pokemon.level}, ${sex.label}`}
    >
      <div className="owned-pokemon-card-top">
        <span>#{dex}</span>
        <div>{pokemon.teamSlot && <strong>TIME · {pokemon.teamSlot}</strong>}</div>
      </div>
      <div className="owned-pokemon-visual">
        <PokemonVisual pokemon={pokemon} assetRole="official-artwork" />
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
          <span>
            {pokemon.box} ·{' '}
            <span role="img" aria-label={sex.label}>
              {sex.glyph}
            </span>
          </span>
          {pokemon.shiny && <strong>SHINY</strong>}
        </div>
      </div>
    </a>
  );
}

export function OwnedPokemonCollectionPage() {
  const collection = useOwnedPokemonCollection();
  const initial = useMemo(readCollectionSession, []);
  const pokemon = useMemo(
    () => (collection.status === 'authenticated' ? createOwnedPokemonView(collection.pokemon) : []),
    [collection],
  );
  const team = useMemo(
    () =>
      pokemon
        .filter((item) => item.teamSlot !== null)
        .sort((a, b) => (a.teamSlot ?? 99) - (b.teamSlot ?? 99)),
    [pokemon],
  );
  const [mode, setMode] = useState<CollectionMode>(
    initial.mode === 'favorites' ? 'all' : initial.mode,
  );
  const [query, setQuery] = useState(initial.query);
  const [filters, setFilters] = useState<CollectionFilterState>(initial.filters);
  const [speciesContextDex, setSpeciesContextDex] = useState(readSpeciesContextFilter);
  const [organizerPokemonId, setOrganizerPokemonId] = useState('');
  const [organizerKind, setOrganizerKind] = useState<'TEAM' | 'BOX'>('TEAM');
  const [organizerTeamSlot, setOrganizerTeamSlot] = useState(1);
  const [organizerBoxNo, setOrganizerBoxNo] = useState(1);
  const [organizerBoxSlot, setOrganizerBoxSlot] = useState(1);
  const [organizerStatus, setOrganizerStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [organizerMessage, setOrganizerMessage] = useState('');
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

  useEffect(() => () => rememberCollectionScroll(window.scrollY), []);

  const visible = useMemo(() => {
    const needle = normalize(query);
    const base = pokemon.filter((item) => {
      if (speciesContextDex && item.dex !== speciesContextDex) return false;
      if (!needle) return true;
      return normalize(item.nickname).includes(needle) || normalize(item.species).includes(needle);
    });
    return applyCollectionFilters(base, filters);
  }, [filters, pokemon, query, speciesContextDex]);

  const boxes = useMemo(() => {
    const grouped = new Map<string, OwnedPokemonView[]>();
    for (const item of visible) {
      const list = grouped.get(item.box) ?? [];
      list.push(item);
      grouped.set(item.box, list);
    }
    return [...grouped.entries()];
  }, [visible]);

  const contextualSpecies = speciesContextDex
    ? (pokemon.find((item) => item.dex === speciesContextDex)?.species ??
      `#${String(speciesContextDex).padStart(3, '0')}`)
    : null;

  const clearSpeciesContext = () => {
    setSpeciesContextDex(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('species');
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
    rememberHubDestination('/pokemon');
  };

  const patchFilters = (patch: Partial<CollectionFilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const persistOrganizerMove = async () => {
    if (!organizerPokemonId || organizerStatus === 'saving') return;
    setOrganizerStatus('saving');
    setOrganizerMessage('Salvando posição oficial…');

    try {
      const target =
        organizerKind === 'TEAM'
          ? { placementKind: 'TEAM' as const, boxNo: null, slotNo: organizerTeamSlot }
          : {
              placementKind: 'BOX' as const,
              boxNo: organizerBoxNo,
              slotNo: organizerBoxSlot,
            };
      const result = await movePlayerPortalPokemon({
        pokemonInstanceId: organizerPokemonId,
        target,
      });

      if (result.status === 'unauthenticated') {
        setOrganizerStatus('error');
        setOrganizerMessage('Sua sessão expirou. Abra o Hub novamente pelo acesso oficial.');
        return;
      }

      setOrganizerMessage('Posição salva. Sincronizando coleção…');
      window.location.reload();
    } catch {
      setOrganizerStatus('error');
      setOrganizerMessage('Não foi possível salvar a posição agora. Nada foi alterado na tela.');
    }
  };

  const metaValue =
    collection.status === 'authenticated'
      ? `${pokemon.length} POKÉMON`
      : collection.status === 'loading'
        ? 'SINCRONIZANDO'
        : 'INDISPONÍVEL';

  return (
    <main className="owned-pokemon-page owned-pokemon-page-v2">
      <HubModuleHeader module="pokemon" metaLabel="BOX" metaValue={metaValue} />

      <div className="owned-pokemon-page-content">
        <header className="owned-pokemon-header owned-pokemon-header-v2">
          <div>
            <span className="owned-pokemon-kicker">POKÉMON DO TREINADOR</span>
            <h1>Time + Box</h1>
            <p>
              {collection.status === 'authenticated'
                ? 'Coleção sincronizada com o registro oficial do RPG.'
                : collection.status === 'loading'
                  ? 'Sincronizando sua coleção oficial.'
                  : 'A coleção oficial não está disponível nesta sessão.'}
            </p>
          </div>
        </header>

        {collection.status === 'authenticated' ? (
          <>
            <section
              className="owned-pokemon-team-section"
              aria-labelledby="owned-current-team-title"
            >
              <header className="owned-pokemon-team-head">
                <div>
                  <span>TIME ATUAL · {team.length}/6</span>
                  <h2 id="owned-current-team-title">Seus parceiros ativos</h2>
                </div>
                <a href="/team">
                  VER TIME <span aria-hidden="true">→</span>
                </a>
              </header>
              <div className="owned-pokemon-team-grid">
                {team.map((item) => (
                  <TeamCard key={item.instanceId} pokemon={item} />
                ))}
              </div>
            </section>

            <section className="owned-pokemon-storage-section" aria-labelledby="owned-box-title">
              <header className="owned-pokemon-storage-head">
                <div>
                  <span>BOX</span>
                  <h2 id="owned-box-title">Todos os Pokémon</h2>
                </div>
                <p>{pokemon.length} registros oficiais</p>
              </header>

              <section className="owned-pokemon-filter-shell" aria-label="Organizar coleção">
                <div className="owned-pokemon-filter-strip">
                  <label>
                    <span>ORGANIZAR</span>
                    <select
                      value={organizerPokemonId}
                      onChange={(event) => {
                        setOrganizerPokemonId(event.target.value);
                        setOrganizerStatus('idle');
                        setOrganizerMessage('');
                      }}
                    >
                      <option value="">Escolha um Pokémon</option>
                      {pokemon.map((item) => (
                        <option key={item.instanceId} value={item.instanceId}>
                          {item.nickname} · {item.box}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>DESTINO</span>
                    <select
                      value={organizerKind}
                      onChange={(event) =>
                        setOrganizerKind(event.target.value === 'BOX' ? 'BOX' : 'TEAM')
                      }
                    >
                      <option value="TEAM">Time</option>
                      <option value="BOX">Box</option>
                    </select>
                  </label>
                  {organizerKind === 'TEAM' ? (
                    <label>
                      <span>SLOT DO TIME</span>
                      <select
                        value={organizerTeamSlot}
                        onChange={(event) => setOrganizerTeamSlot(Number(event.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6].map((slot) => (
                          <option key={slot} value={slot}>
                            Slot {slot}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label>
                        <span>BOX Nº</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={organizerBoxNo}
                          onChange={(event) =>
                            setOrganizerBoxNo(Math.max(1, Number(event.target.value) || 1))
                          }
                        />
                      </label>
                      <label>
                        <span>SLOT</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={organizerBoxSlot}
                          onChange={(event) =>
                            setOrganizerBoxSlot(Math.max(1, Number(event.target.value) || 1))
                          }
                        />
                      </label>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={!organizerPokemonId || organizerStatus === 'saving'}
                    onClick={() => void persistOrganizerMove()}
                  >
                    {organizerStatus === 'saving' ? 'SALVANDO…' : 'SALVAR POSIÇÃO'}
                  </button>
                </div>
                {organizerMessage && (
                  <div className="owned-pokemon-runtime-note" role="status">
                    <span aria-hidden="true" /> {organizerMessage}
                  </div>
                )}
              </section>

              {speciesContextDex && (
                <div className="owned-pokemon-context-filter">
                  <div>
                    <span>VINDO DA POKÉDEX</span>
                    <strong>
                      {contextualSpecies} · #{String(speciesContextDex).padStart(3, '0')}
                    </strong>
                  </div>
                  <button type="button" onClick={clearSpeciesContext}>
                    VER TODA A COLEÇÃO
                  </button>
                </div>
              )}

              <section className="owned-pokemon-toolbar" aria-label="Ferramentas da coleção">
                <fieldset className="owned-pokemon-modes" aria-label="Modo da coleção">
                  {(
                    [
                      ['all', 'TODOS'],
                      ['boxes', 'BOXES'],
                    ] as const
                  ).map(([id, label]) => (
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

              <section className="owned-pokemon-filter-shell" aria-label="Filtros da coleção">
                <div className="owned-pokemon-filter-strip">
                  <label>
                    <span>LOCAL</span>
                    <select
                      value={filters.presence}
                      onChange={(event) =>
                        patchFilters({ presence: event.target.value as CollectionPresenceFilter })
                      }
                    >
                      <option value="all">Todos</option>
                      <option value="team">No Time</option>
                      <option value="storage">Na Box</option>
                    </select>
                  </label>
                  <label>
                    <span>SHINY</span>
                    <select
                      value={filters.shiny}
                      onChange={(event) =>
                        patchFilters({ shiny: event.target.value as CollectionShinyFilter })
                      }
                    >
                      <option value="all">Todos</option>
                      <option value="shiny">Somente shiny</option>
                      <option value="regular">Não shiny</option>
                    </select>
                  </label>
                  <label>
                    <span>ORDENAR</span>
                    <select
                      value={filters.sort}
                      onChange={(event) =>
                        patchFilters({ sort: event.target.value as CollectionSort })
                      }
                    >
                      <option value="dex">Nº da Pokédex</option>
                      <option value="name">Nome A—Z</option>
                      <option value="level-desc">Nível ↓</option>
                      <option value="level-asc">Nível ↑</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFilters({ ...DEFAULT_COLLECTION_FILTERS })}
                  >
                    LIMPAR FILTROS
                  </button>
                </div>
              </section>

              <div className="owned-pokemon-runtime-note">
                <span aria-hidden="true" /> {visible.length} RESULTADO
                {visible.length === 1 ? '' : 'S'} · DADOS AUTORITATIVOS
              </div>

              {mode === 'boxes' ? (
                <div className="owned-pokemon-boxes">
                  {boxes.map(([box, items]) => (
                    <section className="owned-pokemon-box" key={box}>
                      <header>
                        <strong>{box}</strong>
                        <span>{items.length} REGISTROS</span>
                      </header>
                      <div className="owned-pokemon-grid">
                        {items.map((item) => (
                          <PokemonCard key={item.instanceId} pokemon={item} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="owned-pokemon-grid">
                  {visible.map((item) => (
                    <PokemonCard key={item.instanceId} pokemon={item} />
                  ))}
                </div>
              )}

              {visible.length === 0 && (
                <div className="owned-pokemon-empty">
                  <strong>Nenhum Pokémon encontrado.</strong>
                  <span>Ajuste a busca ou os filtros da coleção.</span>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="owned-pokemon-empty">
            <strong>
              {collection.status === 'loading' ? 'Sincronizando Box…' : 'Box indisponível.'}
            </strong>
            <span>
              {collection.status === 'unauthenticated'
                ? 'Abra o Hub pelo acesso oficial do seu treinador.'
                : 'Não foi possível consultar a coleção autoritativa agora.'}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
