import { useMemo, useState } from 'react';
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
}

export function Player360Page({ canReadSensitive }: Player360PageProps) {
  const [filters, setFilters] = useState<PlayerSearchFilters>(EMPTY_PLAYER_SEARCH_FILTERS);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const errors = useMemo(() => validatePlayerSearchFilters(filters), [filters]);
  const normalizedQuery = useMemo(() => toPlayerSearchQuery(filters), [filters]);

  function patchFilters(patch: Partial<PlayerSearchFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="player360-page">
      <section className="player-search-panel" aria-labelledby="player-search-title">
        <div className="player-search-heading">
          <div>
            <span className="panel-kicker">PLAYER 360</span>
            <h2 id="player-search-title">Encontre a pessoa certa antes de agir.</h2>
            <p>
              A busca seguirá o contrato real do backend. Nesta etapa ela prepara filtros, mas não envia
              requisições até a Admin API e a sessão administrativa existirem.
            </p>
          </div>
          <span className="contract-chip">READ-ONLY · CONTRATO REAL</span>
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
                <option key={status} value={status}>{status}</option>
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
                    ? 'Requer capability player.read_sensitive.'
                    : 'Bloqueado até sessão autenticada comprovar player.read_sensitive.'}
                </small>
              </span>
            </label>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="filter-errors" role="alert">
            {errors.map((error) => <span key={error}>{error}</span>)}
          </div>
        ) : null}

        <div className="player-search-footer">
          <div className="query-summary">
            <span>CONSULTA PREPARADA</span>
            <code>{JSON.stringify(normalizedQuery)}</code>
          </div>
          <button className="primary-action" type="button" disabled>
            Buscar jogadores
            <small>ADMIN API PENDENTE</small>
          </button>
        </div>
      </section>

      <section className="player360-workspace" aria-labelledby="player360-workspace-title">
        <div className="player360-empty-sidebar">
          <span className="empty-avatar" aria-hidden="true">?</span>
          <span className="panel-kicker">NENHUM JOGADOR SELECIONADO</span>
          <h2 id="player360-workspace-title">A ficha começa pelo contexto, não pela ação.</h2>
          <p>
            Quando a API estiver conectada, escolher um resultado manterá identidade, status e localização
            visíveis enquanto o ADM navega pela ficha.
          </p>
          <div className="contract-note">
            <strong>Sem dados fictícios.</strong>
            <span>Este espaço só será preenchido por uma resposta Player360View autorizada pelo servidor.</span>
          </div>
        </div>

        <div className="player360-contract-map">
          <div className="contract-map-heading">
            <div>
              <span className="panel-kicker">ANATOMIA DA FICHA</span>
              <h3>Oito áreas, uma pessoa.</h3>
            </div>
            <span className="muted-badge">BACKEND READY</span>
          </div>

          <section className="player360-tabs" aria-label="Áreas planejadas do Player 360">
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
