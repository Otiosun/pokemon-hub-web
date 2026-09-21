import { useEffect, useMemo, useRef, useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { rememberHubDestination } from '../../navigation/hubNavigationSession';
import {
  movePlayerPortalPokemon,
  type PlayerPortalRosterPlacement,
} from '../../player-api/playerPortalRosterClient';
import { OwnedPokemonImage } from '../../visual-assets/PokemonPreviewImage';
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
    <OwnedPokemonImage
      dex={pokemon.dex}
      assetRole={assetRole}
      shiny={pokemon.shiny}
      formSlug={pokemon.formSlug}
      speciesSlug={pokemon.speciesSlug}
      alt=""
      aria-hidden="true"
      loading={assetRole === 'portrait' ? 'eager' : 'lazy'}
      decoding="async"
      fallbackLabel="?"
    />
  );
}

function TeamCard({
  pokemon,
  organizing,
  selected,
  disabled,
  onSelect,
}: {
  pokemon: OwnedPokemonView;
  organizing: boolean;
  selected: boolean;
  disabled: boolean;
  onSelect: (pokemon: OwnedPokemonView) => void;
}) {
  const className = `owned-pokemon-team-card${pokemon.shiny ? ' is-shiny' : ''}${selected ? ' is-selected' : ''}`;
  const body = (
    <>
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
    </>
  );

  if (organizing) {
    return (
      <button
        type="button"
        className={className}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`Selecionar ${pokemon.nickname}, slot ${pokemon.teamSlot ?? 'sem número'}`}
        onClick={() => onSelect(pokemon)}
      >
        {body}
      </button>
    );
  }

  return (
    <a
      className={className}
      href={`/pokemon/${pokemon.instanceId}`}
      aria-label={`Abrir ${pokemon.nickname}, slot ${pokemon.teamSlot ?? 'sem número'}`}
    >
      {body}
    </a>
  );
}

function PokemonCard({
  pokemon,
  organizing,
  selected,
  disabled,
  onSelect,
}: {
  pokemon: OwnedPokemonView;
  organizing: boolean;
  selected: boolean;
  disabled: boolean;
  onSelect: (pokemon: OwnedPokemonView) => void;
}) {
  const sex = sexSymbol(pokemon);
  const dex = pokemon.dex === null ? '---' : String(pokemon.dex).padStart(3, '0');
  const className = `owned-pokemon-card${pokemon.teamSlot ? ' is-in-team' : ''}${pokemon.shiny ? ' is-shiny' : ''}${selected ? ' is-selected' : ''}`;
  const body = (
    <>
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
    </>
  );

  if (organizing) {
    return (
      <button
        type="button"
        className={className}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`Selecionar ${pokemon.nickname}, ${pokemon.species}, nível ${pokemon.level}`}
        onClick={() => onSelect(pokemon)}
      >
        {body}
      </button>
    );
  }

  return (
    <a
      className={className}
      href={`/pokemon/${pokemon.instanceId}`}
      aria-label={`Abrir ${pokemon.nickname}, ${pokemon.species}, nível ${pokemon.level}, ${sex.label}`}
    >
      {body}
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
  const [mode, setMode] = useState<CollectionMode>(initial.mode);
  const [query, setQuery] = useState(initial.query);
  const [filters, setFilters] = useState<CollectionFilterState>(initial.filters);
  const [speciesContextDex, setSpeciesContextDex] = useState(readSpeciesContextFilter);
  const [organizing, setOrganizing] = useState(false);
  const [organizerPokemonId, setOrganizerPokemonId] = useState('');
  const [organizerBoxNo, setOrganizerBoxNo] = useState(1);
  const [organizerStatus, setOrganizerStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [organizerMessage, setOrganizerMessage] = useState('');
  const [lastMove, setLastMove] = useState<{
    pokemonInstanceId: string;
    previous: PlayerPortalRosterPlacement;
    label: string;
  } | null>(null);
  const restoredScroll = useRef(false);
  const organizerRef = useRef<HTMLElement | null>(null);

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
  const selectedOrganizerPokemon = organizerPokemonId
    ? pokemon.find((item) => item.instanceId === organizerPokemonId) ?? null
    : null;
  const teamBySlot = useMemo(
    () => new Map(team.map((item) => [item.teamSlot, item] as const)),
    [team],
  );
  const boxBySlot = useMemo(
    () =>
      new Map(
        pokemon
          .filter((item) => item.boxNo === organizerBoxNo && item.storageSlot !== null)
          .map((item) => [item.storageSlot, item] as const),
      ),
    [organizerBoxNo, pokemon],
  );

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

  const placementForPokemon = (pokemon: OwnedPokemonView): PlayerPortalRosterPlacement =>
    pokemon.teamSlot !== null
      ? { placementKind: 'TEAM', boxNo: null, slotNo: pokemon.teamSlot }
      : {
          placementKind: 'BOX',
          boxNo: pokemon.boxNo ?? 1,
          slotNo: pokemon.storageSlot ?? 1,
        };

  const selectOrganizerPokemon = (candidate: OwnedPokemonView) => {
    if (!organizing || organizerStatus === 'saving') return;
    if (organizerPokemonId === candidate.instanceId) {
      setOrganizerPokemonId('');
      setOrganizerMessage('Seleção cancelada.');
      return;
    }
    setOrganizerPokemonId(candidate.instanceId);
    if (candidate.boxNo !== null) setOrganizerBoxNo(candidate.boxNo);
    setLastMove(null);
    setOrganizerMessage(`${candidate.nickname} selecionado. Agora toque no slot de destino.`);
    setOrganizerStatus('idle');

    requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      organizerRef.current?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  const moveSelectedPokemon = async (target: PlayerPortalRosterPlacement) => {
    if (!selectedOrganizerPokemon || organizerStatus === 'saving') return;

    if (
      target.placementKind === 'BOX' &&
      selectedOrganizerPokemon.teamSlot !== null &&
      team.length <= 1 &&
      targetOccupant === null
    ) {
      setOrganizerMessage('O Time precisa manter pelo menos um Pokémon ativo.');
      return;
    }

    const current = placementForPokemon(selectedOrganizerPokemon);
    if (
      current.placementKind === target.placementKind &&
      current.boxNo === target.boxNo &&
      current.slotNo === target.slotNo
    ) {
      setOrganizerMessage('Esse já é o local atual do Pokémon.');
      return;
    }

    const targetOccupant =
      target.placementKind === 'TEAM'
        ? teamBySlot.get(target.slotNo) ?? null
        : pokemon.find(
            (item) =>
              item.boxNo === target.boxNo &&
              item.storageSlot === target.slotNo,
          ) ?? null;

    setOrganizerStatus('saving');
    setOrganizerMessage('Salvando nova posição…');

    try {
      const result = await movePlayerPortalPokemon({
        pokemonInstanceId: selectedOrganizerPokemon.instanceId,
        target,
      });

      if (result.status === 'unauthenticated') {
        setOrganizerStatus('error');
        setOrganizerMessage('Sua sessão expirou. Abra o Hub novamente pelo acesso oficial.');
        return;
      }

      collection.replacePokemon(result.pokemon);
      setLastMove({
        pokemonInstanceId: selectedOrganizerPokemon.instanceId,
        previous: current,
        label: selectedOrganizerPokemon.nickname,
      });
      setOrganizerPokemonId('');
      setOrganizerStatus('idle');
      setOrganizerMessage(
        targetOccupant
          ? `${selectedOrganizerPokemon.nickname} e ${targetOccupant.nickname} trocaram de posição.`
          : `${selectedOrganizerPokemon.nickname} foi movido para ${target.placementKind === 'TEAM' ? `Time · slot ${target.slotNo}` : `Box ${target.boxNo} · slot ${target.slotNo}`}.`,
      );
    } catch {
      setOrganizerStatus('error');
      setOrganizerMessage('Não foi possível salvar a posição agora. A coleção não foi alterada.');
    }
  };

  const undoLastMove = async () => {
    if (!lastMove || organizerStatus === 'saving') return;
    setOrganizerStatus('saving');
    setOrganizerMessage(`Desfazendo a última mudança de ${lastMove.label}…`);

    try {
      const result = await movePlayerPortalPokemon({
        pokemonInstanceId: lastMove.pokemonInstanceId,
        target: lastMove.previous,
      });
      if (result.status === 'unauthenticated') {
        setOrganizerStatus('error');
        setOrganizerMessage('Sua sessão expirou. Abra o Hub novamente pelo acesso oficial.');
        return;
      }
      collection.replacePokemon(result.pokemon);
      setLastMove(null);
      setOrganizerStatus('idle');
      setOrganizerMessage('Última mudança desfeita.');
    } catch {
      setOrganizerStatus('error');
      setOrganizerMessage('Não foi possível desfazer a última mudança.');
    }
  };

  const toggleOrganizer = () => {
    setOrganizing((current) => !current);
    setOrganizerPokemonId('');
    setOrganizerStatus('idle');
    setOrganizerMessage('');
    setLastMove(null);
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
                <div className="owned-pokemon-team-actions">
                  <button
                    type="button"
                    className={organizing ? 'is-active' : undefined}
                    onClick={toggleOrganizer}
                  >
                    {organizing ? 'CONCLUIR' : 'ORGANIZAR'}
                  </button>
                  <a href="/team">
                    VER TIME <span aria-hidden="true">→</span>
                  </a>
                </div>
              </header>
              <div className="owned-pokemon-team-grid">
                {team.map((item) => (
                  <TeamCard
                    key={item.instanceId}
                    pokemon={item}
                    organizing={organizing}
                    selected={organizerPokemonId === item.instanceId}
                    disabled={organizerStatus === 'saving'}
                    onSelect={selectOrganizerPokemon}
                  />
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

              {organizing ? (
                <section
                  ref={organizerRef}
                  className="owned-roster-direct"
                  aria-label="Organizar Time e Box"
                >
                  <header className="owned-roster-direct-head">
                    <div>
                      <span>ORGANIZAÇÃO DIRETA</span>
                      <strong>
                        {selectedOrganizerPokemon
                          ? `${selectedOrganizerPokemon.nickname} selecionado`
                          : 'Escolha um Pokémon'}
                      </strong>
                      <small>
                        {selectedOrganizerPokemon
                          ? 'Agora toque em qualquer slot do Time ou da Box. Slot ocupado faz troca automática.'
                          : 'Toque em um Pokémon acima ou na coleção abaixo. Depois escolha visualmente o destino.'}
                      </small>
                    </div>
                    {selectedOrganizerPokemon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOrganizerPokemonId('');
                          setOrganizerMessage('');
                        }}
                      >
                        CANCELAR SELEÇÃO
                      </button>
                    ) : null}
                  </header>

                  <div className="owned-roster-destinations">
                    <section aria-labelledby="owned-roster-team-destination">
                      <header>
                        <span>DESTINO</span>
                        <strong id="owned-roster-team-destination">TIME</strong>
                      </header>
                      <div className="owned-roster-slot-grid is-team" aria-label="Slots do Time">
                        {[1, 2, 3, 4, 5, 6].map((slot) => {
                          const occupant = teamBySlot.get(slot) ?? null;
                          const current =
                            selectedOrganizerPokemon?.teamSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              className={current ? 'is-current' : undefined}
                              disabled={
                                !selectedOrganizerPokemon ||
                                organizerStatus === 'saving' ||
                                current
                              }
                              onClick={() =>
                                void moveSelectedPokemon({
                                  placementKind: 'TEAM',
                                  boxNo: null,
                                  slotNo: slot,
                                })
                              }
                            >
                              <span>{String(slot).padStart(2, '0')}</span>
                              <div>
                                {occupant ? (
                                  <>
                                    <PokemonVisual pokemon={occupant} assetRole="portrait" />
                                    <strong>{occupant.nickname}</strong>
                                  </>
                                ) : (
                                  <strong>VAZIO</strong>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section aria-labelledby="owned-roster-box-destination">
                      <header className="owned-roster-box-nav">
                        <div>
                          <span>DESTINO</span>
                          <strong id="owned-roster-box-destination">
                            BOX {String(organizerBoxNo).padStart(2, '0')}
                          </strong>
                        </div>
                        <div>
                          <button
                            type="button"
                            aria-label="Box anterior"
                            disabled={organizerBoxNo <= 1 || organizerStatus === 'saving'}
                            onClick={() => setOrganizerBoxNo((current) => Math.max(1, current - 1))}
                          >
                            ‹
                          </button>
                          <span>BOX {String(organizerBoxNo).padStart(2, '0')}</span>
                          <button
                            type="button"
                            aria-label="Próxima Box"
                            disabled={organizerStatus === 'saving'}
                            onClick={() => setOrganizerBoxNo((current) => current + 1)}
                          >
                            ›
                          </button>
                        </div>
                      </header>

                      <div
                        className="owned-roster-slot-grid is-box"
                        aria-label={`Slots da Box ${organizerBoxNo}`}
                      >
                        {Array.from({ length: 30 }, (_, index) => index + 1).map((slot) => {
                          const occupant = boxBySlot.get(slot) ?? null;
                          const current =
                            selectedOrganizerPokemon?.boxNo === organizerBoxNo &&
                            selectedOrganizerPokemon?.storageSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              className={current ? 'is-current' : undefined}
                              disabled={
                                !selectedOrganizerPokemon ||
                                organizerStatus === 'saving' ||
                                current ||
                                (selectedOrganizerPokemon.teamSlot !== null &&
                                  team.length <= 1 &&
                                  occupant === null)
                              }
                              title={
                                selectedOrganizerPokemon?.teamSlot !== null &&
                                team.length <= 1 &&
                                occupant === null
                                  ? 'O Time precisa manter pelo menos um Pokémon ativo'
                                  : occupant
                                    ? `Trocar com ${occupant.nickname}`
                                    : `Slot ${slot} vazio`
                              }
                              onClick={() =>
                                void moveSelectedPokemon({
                                  placementKind: 'BOX',
                                  boxNo: organizerBoxNo,
                                  slotNo: slot,
                                })
                              }
                            >
                              <span>{String(slot).padStart(2, '0')}</span>
                              <div>
                                {occupant ? (
                                  <>
                                    <PokemonVisual pokemon={occupant} assetRole="portrait" />
                                    <strong>{occupant.nickname}</strong>
                                  </>
                                ) : (
                                  <strong>+</strong>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>

                  {organizerMessage ? (
                    <div className="owned-roster-feedback" role="status">
                      <span>{organizerMessage}</span>
                      {lastMove && organizerStatus !== 'saving' ? (
                        <button type="button" onClick={() => void undoLastMove()}>
                          DESFAZER
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}

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
                          <PokemonCard
                            key={item.instanceId}
                            pokemon={item}
                            organizing={organizing}
                            selected={organizerPokemonId === item.instanceId}
                            disabled={organizerStatus === 'saving'}
                            onSelect={selectOrganizerPokemon}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="owned-pokemon-grid">
                  {visible.map((item) => (
                    <PokemonCard
                            key={item.instanceId}
                            pokemon={item}
                            organizing={organizing}
                            selected={organizerPokemonId === item.instanceId}
                            disabled={organizerStatus === 'saving'}
                            onSelect={selectOrganizerPokemon}
                          />
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
