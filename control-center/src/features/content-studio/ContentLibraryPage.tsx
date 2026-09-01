import { useMemo, useState } from 'react';
import {
  type AdminApiClient,
  AdminApiError,
  type ContentLibraryItem,
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
  readonly client: Pick<AdminApiClient, 'searchContent'>;
}

interface RequestErrorView {
  readonly message: string;
  readonly correlationId: string | null;
}

function requestError(error: unknown): RequestErrorView {
  if (error instanceof AdminApiError) {
    return { message: error.message, correlationId: error.correlationId };
  }
  return { message: 'A consulta da biblioteca falhou.', correlationId: null };
}

function itemKey(item: ContentLibraryItem): string {
  return `${item.releaseId}:${item.resourceKind}:${item.resourceId}`;
}

export function ContentLibraryPage({ client }: ContentLibraryPageProps) {
  const [filters, setFilters] = useState<ContentLibraryFilters>(EMPTY_CONTENT_LIBRARY_FILTERS);
  const [items, setItems] = useState<readonly ContentLibraryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<RequestErrorView | null>(null);
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
      setError(requestError(cause));
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
