import { useMemo, useState } from 'react';
import {
  type AdminApiClient,
  AdminApiError,
  type ContentLibraryItem,
  type ContentUnpublishedRelease,
} from '../../lib/api/admin-api';
import {
  CONTENT_RELEASE_STATUSES,
  CONTENT_RESOURCE_KINDS,
  CONTENT_RESOURCE_LABELS,
  type ContentLibraryFilters,
  EMPTY_CONTENT_LIBRARY_FILTERS,
  toContentLibraryQuery,
} from './content-library-model';
import './content-library.css';

interface ContentLibraryPageProps {
  readonly client: Pick<AdminApiClient, 'searchContent' | 'listUnpublishedContent'>;
}

interface RequestErrorView {
  readonly message: string;
  readonly correlationId: string | null;
}

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

const UTC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function requestError(error: unknown, fallbackMessage: string): RequestErrorView {
  if (error instanceof AdminApiError) {
    return { message: error.message, correlationId: error.correlationId };
  }
  return { message: fallbackMessage, correlationId: null };
}

function itemKey(item: ContentLibraryItem): string {
  return `${item.releaseId}:${item.resourceKind}:${item.resourceId}`;
}

function unpublishedKey(release: ContentUnpublishedRelease): string {
  return release.releaseId;
}

function formatTimestamp(value: string | null): string {
  if (value === null) return 'Sem alteração registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${UTC_DATE_TIME_FORMATTER.format(date)} UTC`;
}

function workflowLabel(release: ContentUnpublishedRelease): string {
  return release.workflowState === 'READY_TO_PUBLISH' ? 'Pronta para revisão' : 'Em edição';
}

function recordedChangeLabel(value: string): string {
  return value === '1' ? '1 alteração registrada' : `${value} alterações registradas`;
}

export function ContentLibraryPage({ client }: ContentLibraryPageProps) {
  const [filters, setFilters] = useState<ContentLibraryFilters>(EMPTY_CONTENT_LIBRARY_FILTERS);
  const [items, setItems] = useState<readonly ContentLibraryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<RequestErrorView | null>(null);
  const [unpublished, setUnpublished] = useState<readonly ContentUnpublishedRelease[]>([]);
  const [unpublishedStatus, setUnpublishedStatus] = useState<LoadStatus>('idle');
  const [unpublishedError, setUnpublishedError] = useState<RequestErrorView | null>(null);
  const query = useMemo(() => toContentLibraryQuery(filters), [filters]);

  function patchFilters(patch: Partial<ContentLibraryFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  async function runSearch(cursor?: string) {
    setStatus('loading');
    setError(null);
    try {
      const response = await client.searchContent(query, cursor);
      setItems((current) =>
        cursor === undefined ? response.items : [...current, ...response.items],
      );
      setNextCursor(response.nextCursor);
      setStatus('ready');
    } catch (cause) {
      setStatus('error');
      setError(requestError(cause, 'A consulta da biblioteca falhou.'));
    }
  }

  async function loadUnpublished() {
    setUnpublishedStatus('loading');
    setUnpublishedError(null);
    setUnpublished([]);
    try {
      setUnpublished(await client.listUnpublishedContent());
      setUnpublishedStatus('ready');
    } catch (cause) {
      setUnpublishedStatus('error');
      setUnpublishedError(requestError(cause, 'A consulta das alterações não publicadas falhou.'));
    }
  }

  return (
    <div className="content-library-page">
      <section className="content-library-panel" aria-labelledby="content-library-title">
        <div className="content-library-heading">
          <div>
            <span className="panel-kicker">BIBLIOTECA DE CONTEÚDO</span>
            <h2 id="content-library-title">Encontre o conteúdo certo sem abrir o editor.</h2>
            <p>
              Pesquisa backend-authoritative por release e recurso. Esta fatia é somente leitura:
              nenhuma ação de lifecycle ou edição está disponível aqui.
            </p>
          </div>
          <span className="content-library-contract-chip">READ-ONLY · API REAL</span>
        </div>

        <form
          className="content-library-filters"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
          }}
        >
          <label className="content-library-field content-library-search-field">
            <span>Buscar por nome, slug ou release</span>
            <input
              maxLength={120}
              onChange={(event) => patchFilters({ query: event.target.value })}
              placeholder="Ex.: Pikachu, thunder-shock, Kanto…"
              value={filters.query}
            />
          </label>

          <label className="content-library-field">
            <span>Tipo</span>
            <select
              onChange={(event) =>
                patchFilters({
                  resourceKind: event.target.value as ContentLibraryFilters['resourceKind'],
                })
              }
              value={filters.resourceKind}
            >
              <option value="">Todos os tipos</option>
              {CONTENT_RESOURCE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {CONTENT_RESOURCE_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>

          <label className="content-library-field">
            <span>Release</span>
            <select
              onChange={(event) =>
                patchFilters({
                  releaseStatus: event.target.value as ContentLibraryFilters['releaseStatus'],
                })
              }
              value={filters.releaseStatus}
            >
              <option value="">Todos os estados</option>
              {CONTENT_RELEASE_STATUSES.map((releaseStatus) => (
                <option key={releaseStatus} value={releaseStatus}>
                  {releaseStatus}
                </option>
              ))}
            </select>
          </label>

          <label className="content-library-field">
            <span>Disponibilidade</span>
            <select
              onChange={(event) =>
                patchFilters({ active: event.target.value as ContentLibraryFilters['active'] })
              }
              value={filters.active}
            >
              <option value="">Ativos e inativos</option>
              <option value="true">Somente ativos</option>
              <option value="false">Somente inativos</option>
            </select>
          </label>

          <div className="content-library-filter-actions">
            <button className="secondary-button" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Consultando…' : 'Pesquisar'}
            </button>
            <button
              className="content-library-clear"
              type="button"
              disabled={status === 'loading'}
              onClick={() => setFilters(EMPTY_CONTENT_LIBRARY_FILTERS)}
            >
              Limpar filtros
            </button>
          </div>
        </form>
      </section>

      <section className="content-unpublished-panel" aria-labelledby="content-unpublished-title">
        <div className="content-unpublished-heading">
          <div>
            <span className="panel-kicker">ALTERAÇÕES NÃO PUBLICADAS</span>
            <h3 id="content-unpublished-title">Releases que ainda não chegaram ao estado publicado.</h3>
            <p>
              Estado autoritativo de releases DRAFT e VALIDATED. A contagem representa alterações
              registradas no ledger; comparação detalhada pertence a uma fatia separada.
            </p>
          </div>
          <div className="content-unpublished-actions">
            <span className="content-library-safety-note">READ-ONLY</span>
            <button
              className="secondary-button"
              type="button"
              disabled={unpublishedStatus === 'loading'}
              onClick={() => void loadUnpublished()}
            >
              {unpublishedStatus === 'loading' ? 'Consultando…' : 'Consultar alterações'}
            </button>
          </div>
        </div>

        <div className="content-unpublished-legend" aria-label="Estados não publicados">
          <span className="content-library-status is-draft">DRAFT</span>
          <span className="content-library-status is-validated">VALIDATED</span>
          <small>Nenhuma consulta é disparada automaticamente.</small>
        </div>

        {unpublishedStatus === 'idle' ? (
          <div className="content-library-state">
            <strong>Consulte quando precisar revisar o trabalho ainda não publicado.</strong>
            <span>A tela permanece silenciosa até uma ação explícita do operador.</span>
          </div>
        ) : null}

        {unpublishedStatus === 'loading' ? (
          <div className="content-library-state" role="status">
            <strong>Consultando alterações não publicadas…</strong>
            <span>O estado vem diretamente da Admin API.</span>
          </div>
        ) : null}

        {unpublishedStatus === 'error' && unpublishedError !== null ? (
          <div className="content-library-state is-error" role="alert">
            <strong>{unpublishedError.message}</strong>
            {unpublishedError.correlationId === null ? null : (
              <span>Correlação: {unpublishedError.correlationId}</span>
            )}
          </div>
        ) : null}

        {unpublishedStatus === 'ready' && unpublished.length === 0 ? (
          <div className="content-library-state">
            <strong>Nenhuma release não publicada encontrada.</strong>
            <span>Não há DRAFT ou VALIDATED visível para este principal.</span>
          </div>
        ) : null}

        {unpublished.length > 0 ? (
          <div className="content-unpublished-grid">
            {unpublished.map((release) => (
              <article className="content-unpublished-card" key={unpublishedKey(release)}>
                <div className="content-unpublished-card-heading">
                  <div>
                    <strong>{release.releaseName}</strong>
                    <small>Release #{release.releaseNo}</small>
                  </div>
                  <span className={`content-library-status is-${release.status.toLowerCase()}`}>
                    {release.status}
                  </span>
                </div>
                <dl className="content-unpublished-metadata">
                  <div>
                    <dt>Fluxo</dt>
                    <dd>{workflowLabel(release)}</dd>
                  </div>
                  <div>
                    <dt>Revisão</dt>
                    <dd>{release.revision}</dd>
                  </div>
                  <div>
                    <dt>Alterações</dt>
                    <dd>{recordedChangeLabel(release.recordedChangeCount)}</dd>
                  </div>
                  <div>
                    <dt>Última alteração</dt>
                    <dd>{formatTimestamp(release.lastChangedAt)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="content-library-results" aria-live="polite">
        <div className="content-library-results-heading">
          <div>
            <span className="panel-kicker">CATÁLOGO</span>
            <h3>
              {status === 'ready'
                ? `${items.length} recurso(s) carregado(s)`
                : 'Conteúdo autorizado'}
            </h3>
          </div>
          <span className="content-library-safety-note">SEM MUTATIONS NESTA TELA</span>
        </div>

        {status === 'idle' ? (
          <div className="content-library-state">
            <strong>Escolha os filtros e consulte quando precisar.</strong>
            <span>Nenhuma busca é disparada sem uma ação explícita do operador.</span>
          </div>
        ) : null}

        {status === 'loading' && items.length === 0 ? (
          <div className="content-library-state" role="status">
            <strong>Consultando a biblioteca…</strong>
            <span>O shell permanece disponível enquanto o backend responde.</span>
          </div>
        ) : null}

        {status === 'error' && error !== null ? (
          <div className="content-library-state is-error" role="alert">
            <strong>{error.message}</strong>
            {error.correlationId === null ? null : <span>Correlação: {error.correlationId}</span>}
          </div>
        ) : null}

        {status === 'ready' && items.length === 0 ? (
          <div className="content-library-state">
            <strong>Nenhum conteúdo encontrado.</strong>
            <span>Ajuste os filtros sem perder o contexto da área.</span>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="content-library-table-wrap">
            <table className="content-library-table">
              <thead>
                <tr>
                  <th>Conteúdo</th>
                  <th>Tipo</th>
                  <th>Release</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={itemKey(item)}>
                    <td>
                      <strong>{item.displayName}</strong>
                      <small>{item.slug}</small>
                    </td>
                    <td>
                      <span className="content-library-kind">
                        {CONTENT_RESOURCE_LABELS[item.resourceKind]}
                      </span>
                    </td>
                    <td>
                      <strong>{item.releaseName}</strong>
                      <small>Release #{item.releaseNo}</small>
                    </td>
                    <td>
                      <span
                        className={`content-library-status is-${item.releaseStatus.toLowerCase()}`}
                      >
                        {item.releaseStatus}
                      </span>
                      <small>{item.active ? 'Ativo' : 'Inativo'}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {nextCursor !== null ? (
          <button
            className="content-library-more"
            type="button"
            disabled={status === 'loading'}
            onClick={() => void runSearch(nextCursor)}
          >
            {status === 'loading' ? 'Carregando…' : 'Carregar mais'}
          </button>
        ) : null}
      </section>
    </div>
  );
}
