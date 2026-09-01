import { useState } from 'react';
import {
  type AdminApiClient,
  AdminApiError,
  type MessagingInboxMetadata,
  type MessagingOperationsView,
  type MessagingOutboxMetadata,
} from '../../lib/api/admin-api';
import './runtime-whatsapp-health.css';

type MessagingOperationsClient = Pick<AdminApiClient, 'getMessagingOperations'>;

type MessagingOperationsState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: MessagingOperationsView }
  | {
      readonly status: 'error';
      readonly message: string;
      readonly correlationId: string | null;
    };

function timestampLabel(value: string | null): string {
  return value ?? '—';
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function InboxRow({ item }: { item: MessagingInboxMetadata }) {
  return (
    <li>
      <strong>{item.status}</strong>
      <span title={item.id}>#{shortId(item.id)}</span>
      <span>{item.attempts} tentativa(s)</span>
      <small>Recebida: {timestampLabel(item.receivedAt)}</small>
    </li>
  );
}

function OutboxRow({ item }: { item: MessagingOutboxMetadata }) {
  return (
    <li>
      <strong>{item.status}</strong>
      <span title={item.id}>#{shortId(item.id)}</span>
      <span>{item.attempts} tentativa(s)</span>
      <small>Criada: {timestampLabel(item.createdAt)}</small>
    </li>
  );
}

export function MessagingOperationsCard({ client }: { client: MessagingOperationsClient }) {
  const [state, setState] = useState<MessagingOperationsState>({ status: 'idle' });

  const refresh = async () => {
    setState({ status: 'loading' });
    try {
      const data = await client.getMessagingOperations();
      setState({ status: 'ready', data });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof AdminApiError
            ? 'Não foi possível consultar as filas de mensageria.'
            : 'A resposta das filas não pôde ser validada.',
        correlationId: error instanceof AdminApiError ? error.correlationId : null,
      });
    }
  };

  const data = state.status === 'ready' ? state.data : null;

  return (
    <section className="runtime-health-card" aria-labelledby="messaging-operations-title">
      <div className="runtime-health-heading">
        <div>
          <span className="eyebrow">MENSAGERIA</span>
          <h3 id="messaging-operations-title">Inbox / Outbox</h3>
        </div>
        <button
          className="secondary-button runtime-health-refresh"
          disabled={state.status === 'loading'}
          onClick={() => void refresh()}
          type="button"
        >
          {state.status === 'loading' ? 'Consultando…' : 'Atualizar filas'}
        </button>
      </div>

      {state.status === 'idle' ? (
        <div className="runtime-health-empty">
          <strong>Ainda não consultado.</strong>
          <p>Dead-letter e contadores aparecem somente após consulta explícita.</p>
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <p className="runtime-health-empty" role="status">
          Consultando metadados operacionais…
        </p>
      ) : null}

      {state.status === 'error' ? (
        <div className="runtime-health-error" role="alert">
          <strong>Consulta indisponível</strong>
          <p>{state.message}</p>
          {state.correlationId === null ? null : <small>Correlação: {state.correlationId}</small>}
        </div>
      ) : null}

      {data === null ? null : (
        <>
          <dl className="runtime-health-facts">
            <div>
              <dt>Inbox · recebidas</dt>
              <dd>{data.inbox.counts.RECEIVED}</dd>
            </div>
            <div>
              <dt>Inbox · processando</dt>
              <dd>{data.inbox.counts.PROCESSING}</dd>
            </div>
            <div>
              <dt>Inbox · processadas</dt>
              <dd>{data.inbox.counts.PROCESSED}</dd>
            </div>
            <div>
              <dt>Inbox · falhas</dt>
              <dd>{data.inbox.counts.FAILED}</dd>
            </div>
            <div>
              <dt>Outbox · pendentes</dt>
              <dd>{data.outbox.counts.PENDING}</dd>
            </div>
            <div>
              <dt>Outbox · enviando</dt>
              <dd>{data.outbox.counts.SENDING}</dd>
            </div>
            <div>
              <dt>Outbox · enviadas</dt>
              <dd>{data.outbox.counts.SENT}</dd>
            </div>
            <div>
              <dt>Outbox · falhas</dt>
              <dd>{data.outbox.counts.FAILED}</dd>
            </div>
            <div>
              <dt>Dead-letter</dt>
              <dd>{data.outbox.counts.DEAD}</dd>
            </div>
          </dl>

          <div className="runtime-health-empty">
            <strong>Inbox recente</strong>
            {data.inbox.recent.length === 0 ? (
              <p>Nenhuma entrada recente.</p>
            ) : (
              <ul>
                {data.inbox.recent.map((item) => (
                  <InboxRow item={item} key={item.id} />
                ))}
              </ul>
            )}
          </div>

          <div className="runtime-health-empty">
            <strong>Outbox recente</strong>
            {data.outbox.recent.length === 0 ? (
              <p>Nenhuma saída recente.</p>
            ) : (
              <ul>
                {data.outbox.recent.map((item) => (
                  <OutboxRow item={item} key={item.id} />
                ))}
              </ul>
            )}
          </div>

          <div className="runtime-health-empty">
            <strong>Dead-letter</strong>
            {data.outbox.deadLetter.length === 0 ? (
              <p>Nenhuma entrada registrada.</p>
            ) : (
              <ul>
                {data.outbox.deadLetter.map((item) => (
                  <OutboxRow item={item} key={item.id} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
