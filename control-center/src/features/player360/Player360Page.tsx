import { useMemo, useState } from 'react';
import { AdminApiError, type AdminApiClient, type Player360Overview, type PlayerSearchItem } from '../../lib/api/admin-api';
import {
  EMPTY_PLAYER_SEARCH_FILTERS,
  PLAYER360_TABS,
  PLAYER360_UNSUPPORTED_SECTIONS,
  PLAYER_STATUSES,
  type PlayerSearchFilters,
  toPlayerSearchQuery,
  validatePlayerSearchFilters,
} from './model';
import './player360.css';

interface Player360PageProps {
  readonly canReadSensitive: boolean;
  readonly client: Pick<AdminApiClient, 'searchPlayers' | 'getPlayer'>;
}

interface RequestErrorView {
  readonly message: string;
  readonly correlationId: string | null;
}

function requestError(error: unknown): RequestErrorView {
  if (error instanceof AdminApiError) {
    return { message: error.message, correlationId: error.correlationId };
  }
  return { message: 'A consulta administrativa falhou.', correlationId: null };
}

function shortId(value: string | null): string {
  if (value === null) return '—';
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function ResultIdentity({ item }: { item: PlayerSearchItem }) {
  const active = item.identities.find((identity) => identity.status === 'ACTIVE') ?? item.identities[0];
  if (active === undefined) return <span className="result-secondary">Sem identidade vinculada</span>;
  return (
    <span className="result-secondary">
      {active.provider}
      {active.externalId === null ? ' · ID protegido' : ` · ${active.externalId}`}
    </span>
  );
}

export function Player360Page({ canReadSensitive, client }: Player360PageProps) {
  const [filters, setFilters] = useState<PlayerSearchFilters>(EMPTY_PLAYER_SEARCH_FILTERS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [results, setResults] = useState<readonly PlayerSearchItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [searchError, setSearchError] = useState<RequestErrorView | null>(null);
  const [selected, setSelected] = useState<Player360Overview | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [selectedError, setSelectedError] = useState<RequestErrorView | null>(null);

  const errors = useMemo(() => validatePlayerSearchFilters(filters), [filters]);
  const normalizedQuery = useMemo(() => toPlayerSearchQuery(filters), [filters]);
  const canSearch = errors.length === 0 && searchStatus !== 'loading';

  function patchFilters(patch: Partial<PlayerSearchFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  async function runSearch(cursor?: string) {
    if (!canSearch) return;
    setSearchStatus('loading');
    setSearchError(null);
    try {
      const response = await client.searchPlayers(normalizedQuery, cursor);
      setResults((current) => (cursor === undefined ? response.items : [...current, ...response.items]));
      setNextCursor(response.nextCursor);
      setSearchStatus('ready');
      if (cursor === undefined) {
        setSelected(null);
        setSelectedStatus('idle');
        setSelectedError(null);
      }
    } catch (error) {
      setSearchStatus('error');
      setSearchError(requestError(error));
    }
  }

  async function selectPlayer(item: PlayerSearchItem) {
    setSelectedStatus('loading');
    setSelectedError(null);
    try {
      const player = await client.getPlayer(item.playerId, filters.includeSensitive && canReadSensitive);
      setSelected(player);
      setSelectedStatus('ready');
    } catch (error) {
      setSelected(null);
      setSelectedStatus('error');
      setSelectedError(requestError(error));
    }
  }

  return (
    <div className="player360-page">
      <section className="player-search-panel" aria-labelledby="player-search-title">
        <div className="player-search-heading">
          <div>
            <span className="panel-kicker">PLAYER 360</span>
            <h2 id="player-search-title">Encontre a pessoa certa antes de agir.</h2>
            <p>
              Busca autorizada pelo backend. O Control Center envia somente filtros; principal, capabilities e
              scopes permanecem server-side.
            </p>
          </div>
          <span className="contract-chip">READ-ONLY · API REAL</span>
        </div>

        <div className="player-search-grid">
          <label className="control-field player-name-field">
            <span>Nome do treinador</span>
            <input
              maxLength={80}
              onChange={(event) => patchFilters({ trainerNamePrefix: event.target.value })}
              placeholder="Começa com..."
              value={filters.trainerNamePrefix}
            />
          </label>

          <label className="control-field">
            <span>Status</span>
            <select
              onChange={(event) =>
                patchFilters({ status: event.target.value as PlayerSearchFilters['status'] })
              }
              value={filters.status}
            >
              <option value="">Todos</option>
              {PLAYER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <button
            className="advanced-toggle"
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            <span>Filtros avançados</span>
            <span aria-hidden="true">{advancedOpen ? '−' : '+'}</span>
          </button>
        </div>

        {advancedOpen ? (
          <div className="advanced-search-grid">
            <label className="control-field">
              <span>ID da região de origem</span>
              <input
                onChange={(event) => patchFilters({ originRegionId: event.target.value })}
                placeholder="UUID"
                value={filters.originRegionId}
              />
            </label>

            <label className="control-field">
              <span>Provedor de identidade</span>
              <input
                disabled={!canReadSensitive}
                onChange={(event) => patchFilters({ identityProvider: event.target.value })}
                placeholder="Ex.: whatsapp"
                value={filters.identityProvider}
              />
            </label>

            <label className="control-field">
              <span>Identificador externo</span>
              <input
                disabled={!canReadSensitive}
                onChange={(event) => patchFilters({ externalId: event.target.value })}
                placeholder="Exige leitura sensível"
                value={filters.externalId}
              />
            </label>

            <label className={`sensitive-toggle ${canReadSensitive ? '' : 'is-locked'}`}>
              <input
                checked={filters.includeSensitive}
                disabled={!canReadSensitive}
                onChange={(event) => patchFilters({ includeSensitive: event.target.checked })}
                type="checkbox"
              />
              <span>
                <strong>Incluir identidades sensíveis</strong>
                <small>
                  {canReadSensitive
                    ? 'Permitido por player.read_sensitive; o backend revalida a capability em cada request.'
                    : 'Sua sessão não possui player.read_sensitive.'}
                </small>
              </span>
            </label>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="filter-errors" role="alert">
            {errors.map((error) => (
              <span key={error}>{error}</span>
            ))}
          </div>
        ) : null}

        <div className="player-search-footer">
          <div className="query-summary">
            <span>FILTROS ATIVOS</span>
            <code>{JSON.stringify(normalizedQuery)}</code>
          </div>
          <button className="primary-action" type="button" disabled={!canSearch} onClick={() => void runSearch()}>
            {searchStatus === 'loading' ? 'Buscando…' : 'Buscar jogadores'}
            <small>{canReadSensitive ? 'SESSÃO AUTORIZADA' : 'LEITURA PADRÃO'}</small>
          </button>
        </div>

        {searchError ? (
          <div className="request-error" role="alert">
            <strong>Não foi possível concluir a busca.</strong>
            <span>{searchError.message}</span>
            {searchError.correlationId ? <code>Correlation {searchError.correlationId}</code> : null}
          </div>
        ) : null}

        {searchStatus === 'ready' ? (
          <section className="player-results" aria-label="Resultados da busca de jogadores">
            <div className="results-heading">
              <div>
                <span className="panel-kicker">RESULTADOS</span>
                <strong>{results.length} carregado(s)</strong>
              </div>
              {nextCursor ? <span className="muted-badge">HÁ MAIS RESULTADOS</span> : null}
            </div>

            {results.length === 0 ? (
              <div className="results-empty">
                <strong>Nenhum jogador corresponde aos filtros.</strong>
                <span>Nada foi alterado. Revise os filtros ou tente uma busca mais ampla.</span>
              </div>
            ) : (
              <div className="results-list">
                {results.map((item) => (
                  <button
                    type="button"
                    className={`player-result ${selected?.playerId === item.playerId ? 'is-selected' : ''}`}
                    key={item.playerId}
                    onClick={() => void selectPlayer(item)}
                  >
                    <span className="result-avatar" aria-hidden="true">
                      {(item.trainerName ?? '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="result-main">
                      <strong>{item.trainerName ?? 'Treinador sem nome'}</strong>
                      <ResultIdentity item={item} />
                      <code>{item.playerId}</code>
                    </span>
                    <span className="result-context">
                      <span>Nv. {item.trainerLevel}</span>
                      <span>{item.status}</span>
                      <span>Área {shortId(item.areaId)}</span>
                    </span>
                    <span className="result-live">
                      <small>ENCOUNTER</small>
                      <strong>{item.activeEncounterStatus ?? '—'}</strong>
                      <small>BATTLE</small>
                      <strong>{item.activeBattleStatus ?? '—'}</strong>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {nextCursor ? (
              <button
                className="secondary-action load-more"
                type="button"
                disabled={searchStatus === 'loading'}
                onClick={() => void runSearch(nextCursor)}
              >
                Carregar próxima página
              </button>
            ) : null}
          </section>
        ) : null}
      </section>

      <section className="player360-workspace" aria-labelledby="player360-workspace-title">
        {selectedStatus === 'loading' ? (
          <div className="player360-empty-sidebar" role="status">
            <span className="empty-avatar" aria-hidden="true">…</span>
            <span className="panel-kicker">CARREGANDO PLAYER 360</span>
            <h2 id="player360-workspace-title">Confirmando o estado atual do jogador.</h2>
            <p>A ficha é relida do backend antes de ser exibida.</p>
          </div>
        ) : selectedError ? (
          <div className="player360-empty-sidebar request-error" role="alert">
            <span className="empty-avatar" aria-hidden="true">!</span>
            <span className="panel-kicker">PLAYER 360 INDISPONÍVEL</span>
            <h2 id="player360-workspace-title">A ficha não foi aberta.</h2>
            <p>{selectedError.message}</p>
            {selectedError.correlationId ? <code>Correlation {selectedError.correlationId}</code> : null}
          </div>
        ) : selected ? (
          <div className="player360-selected">
            <div className="selected-identity">
              <div className="selected-avatar" aria-hidden="true">
                {(selected.profile.trainerName ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <span className="panel-kicker">JOGADOR SELECIONADO</span>
                <h2 id="player360-workspace-title">{selected.profile.trainerName ?? 'Treinador sem nome'}</h2>
                <code>{selected.playerId}</code>
              </div>
              <div className="selected-statuses">
                <span className="status-chip">{selected.status}</span>
                <span className="muted-badge">REV {selected.playerRevision}</span>
              </div>
            </div>

            <div className="overview-grid">
              <article>
                <span>PROGRESSÃO</span>
                <strong>Nível {selected.progression.level}</strong>
                <small>{selected.progression.insigniaPoints} pontos</small>
              </article>
              <article>
                <span>LOCALIZAÇÃO</span>
                <strong>{shortId(selected.location.areaId)}</strong>
                <small>{selected.location.enteredAt ? `Desde ${selected.location.enteredAt}` : 'Sem entrada registrada'}</small>
              </article>
              <article>
                <span>ONBOARDING</span>
                <strong>{selected.onboarding.state ?? '—'}</strong>
                <small>{selected.onboarding.completedAt ? 'Concluído' : 'Não concluído'}</small>
              </article>
              <article>
                <span>POKÉDEX</span>
                <strong>{selected.pokedex.speciesCaught} capturados</strong>
                <small>{selected.pokedex.speciesSeen} vistos</small>
              </article>
            </div>

            <div className="selected-contract-note">
              <strong>Somente leitura nesta fase.</strong>
              <span>Nenhuma ação de suporte ou correção está exposta por este slice.</span>
            </div>
          </div>
        ) : (
          <div className="player360-empty-sidebar">
            <span className="empty-avatar" aria-hidden="true">?</span>
            <span className="panel-kicker">NENHUM JOGADOR SELECIONADO</span>
            <h2 id="player360-workspace-title">A ficha começa pelo contexto, não pela ação.</h2>
            <p>Busque e selecione um resultado. A ficha só é preenchida por uma resposta autorizada do servidor.</p>
            <div className="contract-note">
              <strong>Sem dados fictícios.</strong>
              <span>Principal, target e leitura sensível são revalidados no backend.</span>
            </div>
          </div>
        )}

        <div className="player360-contract-map">
          <div className="contract-map-heading">
            <div>
              <span className="panel-kicker">ANATOMIA DA FICHA</span>
              <h3>Oito áreas, uma pessoa.</h3>
            </div>
            <span className="muted-badge">READ MODEL REAL</span>
          </div>

          <section className="player360-tabs" aria-label="Áreas do Player 360">
            {PLAYER360_TABS.map((tab, index) => (
              <div className="player360-tab-preview" key={tab.id}>
                <span className="tab-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{tab.label}</strong>
                  <small>{tab.sections.join(' · ')}</small>
                </div>
              </div>
            ))}
          </section>

          <div className="unsupported-note">
            <span className="warning-glyph" aria-hidden="true">!</span>
            <div>
              <strong>Duas áreas ainda não existem no domínio.</strong>
              <p>{PLAYER360_UNSUPPORTED_SECTIONS.join(' · ')}</p>
            </div>
            <span className="muted-badge">NÃO INVENTAR NA UI</span>
          </div>
        </div>
      </section>
    </div>
  );
}
