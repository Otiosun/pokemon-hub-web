import { useEffect, useMemo, useState } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { OwnedPokemonImage } from '../../visual-assets/PokemonPreviewImage';
import {
  getPokemon3dCapability,
  type Pokemon3dCapabilityStatus,
} from '../../visual-assets/pokemon3dCapability';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import {
  readOwnedPokemonVisualPreference,
  rememberOwnedPokemonVisualPreference,
} from '../pokemon-detail/pokemonVisualPreference';
import { applyCollectionFilters } from './collectionFilters';
import { readCollectionSession } from './collectionSession';
import { createOwnedPokemonView, findOwnedPokemonView, type OwnedPokemonSex } from './ownedPokemonView';
import { useOwnedPokemonCollection } from './useOwnedPokemonCollection';
import { usePlayerPortalMoveChoices } from './usePlayerPortalMoveChoices';
import './owned-pokemon-detail.css';
import './owned-pokemon-detail-menu.css';

type OwnedVisualMode = '2d' | '3d';
type OwnedDetailTab = 'summary' | 'moves' | 'data';

const MOVE_CATEGORY_LABELS = {
  PHYSICAL: 'FÍSICO',
  SPECIAL: 'ESPECIAL',
  STATUS: 'STATUS',
} as const;

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

function sexLabel(sex: OwnedPokemonSex) {
  if (sex === 'M') return 'Macho';
  if (sex === 'F') return 'Fêmea';
  return 'Sem registro';
}

function sexGlyph(sex: OwnedPokemonSex) {
  if (sex === 'M') return '♂';
  if (sex === 'F') return '♀';
  return '—';
}

function conditionLabel(condition: string) {
  const labels: Record<string, string> = {
    BURN: 'QUEIMADO',
    POISON: 'ENVENENADO',
    BAD_POISON: 'TOXIC',
    PARALYSIS: 'PARALISADO',
    SLEEP: 'DORMINDO',
    FREEZE: 'CONGELADO',
  };
  return labels[condition] ?? condition.replaceAll('_', ' ');
}

function ownedStatusLabel(record: {
  fainted: boolean;
  conditions: readonly string[];
}) {
  if (record.fainted) return 'CAÍDO';
  if (record.conditions.length > 0) return record.conditions.map(conditionLabel).join(' · ');
  return 'OK';
}

function ivLabel(value: number | null) {
  return value === null ? '—' : String(value);
}

function formLabel(formSlug: string | null, speciesSlug: string | null) {
  if (formSlug === null || speciesSlug === null) return 'Não confirmada';
  if (formSlug === speciesSlug) return 'Padrão';
  return formSlug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveOwnedReturnHref(returnHref: string) {
  const params = new URLSearchParams(window.location.search);
  return params.get('origin') === 'journey-lead' ? '/jornada?pokemonContext=lead' : returnHref;
}

function RecordUnavailable({ returnHref, message }: { returnHref: string; message: string }) {
  return (
    <main className="owned-detail-page">
      <HubModuleHeader module="pokemon" metaLabel="REGISTRO" metaValue="INDISPONÍVEL" />
      <section className="owned-detail-not-found">
        <span>REGISTRO INDISPONÍVEL</span>
        <h1>{message}</h1>
        <a href={returnHref} data-nav-mode="up">VOLTAR AO CONTEXTO</a>
      </section>
    </main>
  );
}

export function OwnedPokemonDetailPage({
  instanceId,
  returnHref = '/pokemon',
}: {
  instanceId: string;
  returnHref?: string;
}) {
  const [visualMode, setVisualMode] = useState<OwnedVisualMode>(() =>
    readOwnedPokemonVisualPreference('2d'),
  );
  const [viewerReady, setViewerReady] = useState(false);
  const [modelCapability, setModelCapability] =
    useState<Pokemon3dCapabilityStatus>('checking');
  const [modelRetryNonce, setModelRetryNonce] = useState(0);
  const [activeTab, setActiveTab] = useState<OwnedDetailTab>(() =>
    new URLSearchParams(window.location.search).get('focus') === 'moves' ? 'moves' : 'summary',
  );
  const [pendingMoveDecision, setPendingMoveDecision] = useState<{
    choiceId: string;
    replaceSlotNo: number | null;
  } | null>(null);
  const collection = useOwnedPokemonCollection();
  const moveChoices = usePlayerPortalMoveChoices();
  const pokemon = useMemo(
    () =>
      collection.status === 'authenticated'
        ? createOwnedPokemonView(collection.pokemon)
        : [],
    [collection],
  );
  const record = findOwnedPokemonView(pokemon, instanceId);
  const resolvedReturnHref = resolveOwnedReturnHref(returnHref);
  const capabilitySpeciesSlug =
    record?.catalogResolved ? record.speciesSlug : null;
  const capabilityFormSlug = record?.catalogResolved ? record.formSlug : null;
  const capabilityDex = record?.dex ?? null;
  const capabilityVariant = record?.shiny ? 'shiny' : 'regular';

  const chooseVisualMode = (mode: OwnedVisualMode) => {
    if (mode === '3d') {
      setViewerReady(false);
      if (modelCapability === 'failed') {
        setModelRetryNonce((current) => current + 1);
      }
    }
    setVisualMode(mode);
    rememberOwnedPokemonVisualPreference(mode);
  };

  useEffect(() => {
    let cancelled = false;

    if (capabilityDex === null || !capabilitySpeciesSlug) {
      setModelCapability('unsupported');
      return () => {
        cancelled = true;
      };
    }

    setModelCapability('checking');
    void getPokemon3dCapability({
      dex: capabilityDex,
      species: capabilitySpeciesSlug,
      form: capabilityFormSlug,
      variant: capabilityVariant,
      refresh: modelRetryNonce > 0,
    }).then((capability) => {
      if (!cancelled) setModelCapability(capability.status);
    });

    return () => {
      cancelled = true;
    };
  }, [
    capabilityDex,
    capabilitySpeciesSlug,
    capabilityFormSlug,
    capabilityVariant,
    modelRetryNonce,
  ]);

  useEffect(() => {
    if (modelCapability !== 'unsupported' || visualMode !== '3d') return;
    setViewerReady(false);
    setVisualMode('2d');
    rememberOwnedPokemonVisualPreference('2d');
  }, [modelCapability, visualMode]);

  if (collection.status === 'loading') {
    return <RecordUnavailable returnHref={resolvedReturnHref} message="Sincronizando registro oficial…" />;
  }
  if (collection.status !== 'authenticated') {
    return <RecordUnavailable returnHref={resolvedReturnHref} message="Sessão do treinador indisponível." />;
  }
  if (!record) {
    return <RecordUnavailable returnHref={resolvedReturnHref} message="Pokémon não encontrado na sua coleção." />;
  }

  const dex = record.dex === null ? null : String(record.dex).padStart(3, '0');
  const returningToTeam = resolvedReturnHref === '/team' || resolvedReturnHref.startsWith('/team?');
  const returningToJourney =
    resolvedReturnHref === '/jornada' || resolvedReturnHref.startsWith('/jornada?');
  const returnLabel = returningToTeam ? 'TIME' : returningToJourney ? 'JORNADA' : 'BOX';

  const contextualPokemon = (() => {
    if (returningToJourney) return [record];

    if (returningToTeam) {
      return pokemon
        .filter((item) => item.teamSlot !== null)
        .sort((left, right) => (left.teamSlot ?? 99) - (right.teamSlot ?? 99));
    }

    const session = readCollectionSession();
    const context = new URL(resolvedReturnHref, window.location.origin);
    const speciesRaw = context.searchParams.get('species');
    const speciesDex = speciesRaw ? Number.parseInt(speciesRaw, 10) : null;
    const needle = session.query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const base = pokemon.filter((item) => {
      if (speciesDex && item.dex !== speciesDex) return false;
      if (!needle) return true;
      const nickname = item.nickname
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      const species = item.species
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      return nickname.includes(needle) || species.includes(needle);
    });

    return applyCollectionFilters(base, session.filters);
  })();

  const contextIndex = contextualPokemon.findIndex((item) => item.instanceId === instanceId);
  const previous = contextIndex > 0 ? contextualPokemon[contextIndex - 1] : null;
  const next =
    contextIndex >= 0 && contextIndex < contextualPokemon.length - 1
      ? contextualPokemon[contextIndex + 1]
      : null;
  const locationLabel = record.teamSlot ? `TIME · SLOT ${record.teamSlot}` : record.box;
  const speciesSlug = capabilitySpeciesSlug;
  const identityLine = record.catalogResolved
    ? `${record.nickname === record.species ? '' : `${record.species} · `}#${dex} · NV. ${record.level} · ${sexLabel(record.sex)}`
    : `CATÁLOGO INDISPONÍVEL · NV. ${record.level} · ${sexLabel(record.sex)}`;

  const pendingMoveChoices =
    moveChoices.state.status === 'authenticated'
      ? moveChoices.state.choices.filter((choice) => choice.pokemonInstanceId === instanceId)
      : [];
  const moveLearningBlocked =
    moveChoices.state.status === 'authenticated' && moveChoices.state.blockedByBattle;

  const resolvePendingMove = async (choiceId: string, replaceSlotNo: number | null) => {
    const result = await moveChoices.resolve(choiceId, replaceSlotNo);
    if (result.status === 'authenticated' || result.status === 'stale') {
      setPendingMoveDecision(null);
      await collection.refresh();
    }
  };

  return (
    <main className="owned-detail-page">
      <section className="owned-detail-shell">
        <div className="owned-detail-stage">
          <div className="owned-detail-stage-grid" aria-hidden="true" />
          <div className="owned-detail-ruler" aria-hidden="true"><strong>HEIGHT</strong></div>

          <a href={resolvedReturnHref} data-nav-mode="up" className="owned-detail-stage-back">
            <SideArrow direction="left" />
            <span>{returnLabel}</span>
          </a>

          <div className="owned-detail-stage-actions">
            <fieldset className="owned-detail-view-switch" aria-label="Visual do Pokémon">
              <button type="button" aria-pressed={visualMode === '2d'} onClick={() => chooseVisualMode('2d')}>
                2D
              </button>
              <button
                type="button"
                disabled={
                  !speciesSlug ||
                  modelCapability === 'checking' ||
                  modelCapability === 'unsupported'
                }
                aria-pressed={visualMode === '3d'}
                title={
                  record.shiny && modelCapability === 'unsupported'
                    ? '3D shiny ainda não está disponível neste pipeline'
                    : undefined
                }
                onClick={() => chooseVisualMode('3d')}
              >
                3D
              </button>
            </fieldset>
            <HubMenuTrigger />
          </div>

          <div className={`owned-detail-visual${visualMode === '3d' ? ' is-3d' : ''}`}>
            <div
              className={`owned-detail-artwork${visualMode === '3d' && viewerReady ? ' is-hidden' : ''}`}
            >
              {record.dex !== null ? (
                <OwnedPokemonImage
                  dex={record.dex}
                  assetRole="official-artwork"
                  shiny={record.shiny}
                  formSlug={record.formSlug}
                  speciesSlug={record.speciesSlug}
                  alt={`Ilustração de ${record.species}`}
                  fallbackLabel={record.species.slice(0, 1)}
                  decoding="async"
                />
              ) : (
                <strong aria-hidden="true">?</strong>
              )}
            </div>

            {visualMode === '3d' && speciesSlug && modelCapability === 'ready' ? (
              <div
                className={`owned-detail-viewer${viewerReady ? ' is-ready' : ''}`}
                aria-busy={!viewerReady}
              >
                <GenerationsPokemonViewer
                  species={speciesSlug}
                  name={record.species}
                  onReadyChange={setViewerReady}
                  onFailedSpeciesChange={() => {
                    setViewerReady(false);
                    setModelCapability('failed');
                    setVisualMode('2d');
                    rememberOwnedPokemonVisualPreference('2d');
                  }}
                />
              </div>
            ) : null}

            {visualMode === '3d' && modelCapability === 'failed' ? (
              <div className="owned-detail-model-status" role="status">
                <strong>3D indisponível agora</strong>
                <span>O artwork 2D continua disponível enquanto o modelo não carrega.</span>
                <div>
                  <button
                    type="button"
                    onClick={() => setModelRetryNonce((current) => current + 1)}
                  >
                    TENTAR NOVAMENTE
                  </button>
                  <button type="button" onClick={() => chooseVisualMode('2d')}>
                    FICAR NO 2D
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <nav className="owned-pokemon-side-nav" aria-label="Pokémon anterior e próximo na coleção">
            {previous ? (
              <a href={`/pokemon/${previous.instanceId}`} className="is-previous" aria-label={`Abrir ${previous.nickname}`}>
                <SideArrow direction="left" />
                {previous.dex !== null ? (
                  <OwnedPokemonImage dex={previous.dex} assetRole="icon" shiny={previous.shiny} formSlug={previous.formSlug} speciesSlug={previous.speciesSlug} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                ) : <strong aria-hidden="true">?</strong>}
                <span><small>ANTERIOR</small><strong>{previous.nickname}</strong></span>
              </a>
            ) : <span />}
            {next ? (
              <a href={`/pokemon/${next.instanceId}`} className="is-next" aria-label={`Abrir ${next.nickname}`}>
                <span><small>PRÓXIMO</small><strong>{next.nickname}</strong></span>
                {next.dex !== null ? (
                  <OwnedPokemonImage dex={next.dex} assetRole="icon" shiny={next.shiny} formSlug={next.formSlug} speciesSlug={next.speciesSlug} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                ) : <strong aria-hidden="true">?</strong>}
                <SideArrow direction="right" />
              </a>
            ) : <span />}
          </nav>

          <div className="owned-detail-location-chip"><span>{locationLabel}</span></div>
        </div>

        <div className="owned-detail-data">
          <header className="owned-detail-record-head">
            <div>
              <span>REGISTRO DO POKÉMON</span>
              <h1>{record.nickname}</h1>
              <p>{identityLine}</p>
            </div>
            <fieldset
              className="owned-detail-record-state"
              aria-label="Estado do Pokémon"
              style={{ minWidth: 0, margin: 0, padding: 0, border: 0 }}
            >
              {record.shiny ? <strong>SHINY</strong> : null}
              {record.fainted ? <strong>CAÍDO</strong> : null}
              {!record.fainted && record.conditions.length > 0 ? (
                <strong>{record.conditions.map(conditionLabel).join(' · ')}</strong>
              ) : null}
            </fieldset>
          </header>

          <div className="owned-detail-tabs" role="tablist" aria-label="Seções do Pokémon">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'summary'}
              onClick={() => setActiveTab('summary')}
            >
              RESUMO
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'moves'}
              onClick={() => setActiveTab('moves')}
            >
              GOLPES{pendingMoveChoices.length > 0 ? ` · ${pendingMoveChoices.length}` : ''}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'data'}
              onClick={() => setActiveTab('data')}
            >
              DADOS
            </button>
          </div>

          {activeTab === 'summary' ? (
            <section
              className="owned-detail-tab-panel"
              role="tabpanel"
              aria-label="Resumo autoritativo do Pokémon"
            >
              <dl className="owned-detail-facts">
                <div className="is-wide">
                  <dt>TIPO</dt>
                  <dd className="owned-detail-types">
                    {record.types.length > 0
                      ? record.types.map((type) => (
                          <TypeBadge key={type} type={type} accent={typeAccent(type)} />
                        ))
                      : 'Indisponível'}
                  </dd>
                </div>
                <div><dt>NÍVEL</dt><dd>{record.level}</dd></div>
                <div>
                  <dt>XP</dt>
                  <dd>
                    {record.xpToNextLevel > 0
                      ? `${record.xp} / ${record.xpToNextLevel}`
                      : 'NÍVEL MÁXIMO'}
                  </dd>
                </div>
                <div>
                  <dt>HP</dt>
                  <dd>
                    {record.maxHp === null
                      ? record.currentHp
                      : `${record.currentHp} / ${record.maxHp}`}
                  </dd>
                </div>
                <div><dt>ESTADO</dt><dd>{ownedStatusLabel(record)}</dd></div>
                <div><dt>NATURE</dt><dd>{record.nature ?? '—'}</dd></div>
                <div><dt>ABILITY</dt><dd>{record.ability ?? '—'}</dd></div>
                <div>
                  <dt>SEXO</dt>
                  <dd><span className="owned-detail-sex">{sexGlyph(record.sex)}</span> {sexLabel(record.sex)}</dd>
                </div>
                <div><dt>SHINY</dt><dd>{record.shiny ? 'Sim' : 'Não'}</dd></div>
                <div><dt>FORMA</dt><dd>{formLabel(record.formSlug, record.speciesSlug)}</dd></div>
                <div className="is-wide"><dt>LOCAL ATUAL</dt><dd>{locationLabel}</dd></div>
              </dl>
            </section>
          ) : null}

          {activeTab === 'moves' ? (
            <section
              className="owned-detail-tab-panel"
              role="tabpanel"
              aria-label="Golpes e aprendizado do Pokémon"
            >
              <section className="owned-detail-moves is-detailed" aria-label="Movimentos atuais">
                <header>
                  <span>MOVESET ATUAL</span>
                  <small>{record.moves.length} / 4 SLOTS</small>
                </header>
                {record.moves.length > 0 ? (
                  <div className="owned-detail-move-grid">
                    {record.moves.map((move) => (
                      <article key={move.slotNo}>
                        <header>
                          <span>SLOT {String(move.slotNo).padStart(2, '0')}</span>
                          <strong>{move.displayName ?? 'MOVIMENTO INDISPONÍVEL'}</strong>
                        </header>
                        <div className="owned-detail-move-tags">
                          {move.typeName ? (
                            <TypeBadge
                              type={move.typeName}
                              accent={typeAccent(move.typeName)}
                              compact
                            />
                          ) : null}
                          <span>
                            {move.category ? MOVE_CATEGORY_LABELS[move.category] : 'CATEGORIA —'}
                          </span>
                        </div>
                        <dl>
                          <div><dt>PODER</dt><dd>{move.power ?? '—'}</dd></div>
                          <div><dt>PREC.</dt><dd>{move.accuracy ?? '—'}</dd></div>
                          <div>
                            <dt>PP</dt>
                            <dd>
                              {move.ppCurrent === null || move.maxPp === null
                                ? '—'
                                : `${move.ppCurrent}/${move.maxPp}`}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="owned-detail-empty-block">Nenhum movimento registrado.</div>
                )}
              </section>

              {pendingMoveChoices.length > 0 ? (
                <section className="owned-detail-move-learning" aria-label="Aprendizado pendente">
                  <header>
                    <span>APRENDIZADO PENDENTE</span>
                    <small>{moveLearningBlocked ? 'BLOQUEADO EM BATALHA' : 'DECISÃO NECESSÁRIA'}</small>
                  </header>

                  {pendingMoveChoices.map((choice) => {
                    const saving = moveChoices.savingChoiceId === choice.choiceId;
                    const decision =
                      pendingMoveDecision?.choiceId === choice.choiceId
                        ? pendingMoveDecision
                        : null;
                    const replacedMove =
                      decision?.replaceSlotNo === null || decision === null
                        ? null
                        : choice.currentMoves.find(
                            (move) => move.slotNo === decision.replaceSlotNo,
                          ) ?? null;

                    return (
                      <article key={choice.choiceId}>
                        <div className="owned-detail-move-learning-copy">
                          <span>NV. {choice.learnLevel} · NOVO GOLPE</span>
                          <strong>{choice.moveDisplayName}</strong>
                          <small>
                            Selecione o golpe que será substituído. A alteração só é salva após confirmar.
                          </small>
                        </div>

                        <div className="owned-detail-move-learning-options">
                          {choice.currentMoves.map((move) => {
                            const richMove = record.moves.find(
                              (candidate) => candidate.slotNo === move.slotNo,
                            );
                            const selected = decision?.replaceSlotNo === move.slotNo;
                            return (
                              <button
                                key={move.slotNo}
                                type="button"
                                disabled={moveLearningBlocked || saving}
                                aria-pressed={selected}
                                className={selected ? 'is-selected' : undefined}
                                onClick={() =>
                                  setPendingMoveDecision({
                                    choiceId: choice.choiceId,
                                    replaceSlotNo: move.slotNo,
                                  })
                                }
                              >
                                <span>SLOT {String(move.slotNo).padStart(2, '0')}</span>
                                <strong>{move.displayName}</strong>
                                <small>
                                  {richMove?.ppCurrent === null ||
                                  richMove?.ppCurrent === undefined ||
                                  richMove.maxPp === null
                                    ? 'PP —'
                                    : `PP ${richMove.ppCurrent}/${richMove.maxPp}`}
                                </small>
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            className={`is-skip${decision?.replaceSlotNo === null ? ' is-selected' : ''}`}
                            disabled={moveLearningBlocked || saving}
                            aria-pressed={decision?.replaceSlotNo === null}
                            onClick={() =>
                              setPendingMoveDecision({
                                choiceId: choice.choiceId,
                                replaceSlotNo: null,
                              })
                            }
                          >
                            <span>PULAR</span>
                            <strong>MANTER MOVESET</strong>
                            <small>Não aprender {choice.moveDisplayName}</small>
                          </button>
                        </div>

                        {decision ? (
                          <section
                            className="owned-detail-move-confirm"
                            aria-label="Confirmar decisão"
                          >
                            <div>
                              <span>CONFIRMAR</span>
                              <strong>
                                {decision.replaceSlotNo === null
                                  ? `Manter moveset e não aprender ${choice.moveDisplayName}`
                                  : `Trocar ${replacedMove?.displayName ?? `slot ${decision.replaceSlotNo}`} por ${choice.moveDisplayName}`}
                              </strong>
                            </div>
                            <div>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => setPendingMoveDecision(null)}
                              >
                                CANCELAR
                              </button>
                              <button
                                type="button"
                                className="is-confirm"
                                disabled={moveLearningBlocked || saving}
                                onClick={() =>
                                  void resolvePendingMove(
                                    choice.choiceId,
                                    decision.replaceSlotNo,
                                  )
                                }
                              >
                                {saving ? 'SALVANDO…' : 'CONFIRMAR'}
                              </button>
                            </div>
                          </section>
                        ) : null}
                      </article>
                    );
                  })}

                  {moveLearningBlocked ? (
                    <p>Finalize a batalha ativa antes de alterar os movimentos.</p>
                  ) : moveChoices.message ? (
                    <p role="status">{moveChoices.message}</p>
                  ) : null}
                </section>
              ) : moveChoices.state.status === 'loading' ? (
                <div className="owned-detail-history-empty">
                  Sincronizando decisões de aprendizado…
                </div>
              ) : moveChoices.state.status === 'unauthenticated' ? (
                <div className="owned-detail-history-empty">
                  Abra o Hub novamente pelo WhatsApp para consultar decisões de aprendizado.
                </div>
              ) : moveChoices.state.status === 'unavailable' ? (
                <div className="owned-detail-history-empty">
                  Não foi possível verificar decisões de aprendizado agora.
                </div>
              ) : (
                <div className="owned-detail-history-empty">
                  Nenhuma decisão de aprendizado está pendente para este Pokémon.
                </div>
              )}
            </section>
          ) : null}

          {activeTab === 'data' ? (
            <section
              className="owned-detail-tab-panel"
              role="tabpanel"
              aria-label="Dados individuais do Pokémon"
            >
              <dl className="owned-detail-combat-core" aria-label="Valores individuais">
                <div className="is-wide"><dt>IVs</dt><dd>VALORES INDIVIDUAIS</dd></div>
                <div><dt>HP</dt><dd>{ivLabel(record.ivs.hp)}</dd></div>
                <div><dt>ATTACK</dt><dd>{ivLabel(record.ivs.attack)}</dd></div>
                <div><dt>DEFENSE</dt><dd>{ivLabel(record.ivs.defense)}</dd></div>
                <div><dt>SP. ATK</dt><dd>{ivLabel(record.ivs.spAttack)}</dd></div>
                <div><dt>SP. DEF</dt><dd>{ivLabel(record.ivs.spDefense)}</dd></div>
                <div><dt>SPEED</dt><dd>{ivLabel(record.ivs.speed)}</dd></div>
              </dl>

              {dex !== null ? (
                <a className="owned-detail-species-link" href={`/pokedex/${dex}`}>
                  <span>
                    <small>ESPÉCIE</small>
                    <strong>VER {record.species.toUpperCase()} NA POKÉDEX</strong>
                  </span>
                  <span aria-hidden="true">→</span>
                </a>
              ) : (
                <div className="owned-detail-history-empty">
                  Apresentação da espécie indisponível na release atual.
                </div>
              )}
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
