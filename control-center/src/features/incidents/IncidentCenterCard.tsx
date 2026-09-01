import { useState } from 'react';
import {
  type AdminApiClient,
  AdminApiError,
  type IncidentCenterView,
  type IncidentSignalView,
} from '../../lib/api/admin-api';
import '../runtime/runtime-whatsapp-health.css';

type IncidentCenterClient = Pick<AdminApiClient, 'getIncidentCenter'>;

type IncidentCenterState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: IncidentCenterView }
  | {
      readonly status: 'error';
      readonly message: string;
      readonly correlationId: string | null;
    };

function shortId(value: string): string {
  return value.slice(0, 8);
}

function sourceLabel(source: IncidentSignalView['source']): string {
  if (source === 'ADMIN_OPERATION') return 'Operação administrativa';
  if (source === 'INBOX') return 'Inbox';
  return 'Outbox';
}

function IncidentRow({ signal }: { signal: IncidentSignalView }) {
  return (
    <li>
      <strong>
        {sourceLabel(signal.source)} · {signal.state}
      </strong>
      <span>{signal.kind}</span>
      <span title={signal.id}>#{shortId(signal.id)}</span>
      <small title={signal.correlationId}>Correlação: {shortId(signal.correlationId)}</small>
      {signal.attempts === null ? null : <small>{signal.attempts} tentativa(s)</small>}
      {signal.riskTier === null ? null : <small>Risco R{signal.riskTier}</small>}
      {signal.targetType === null ? null : (
        <small>
          Alvo: {signal.targetType}
          {signal.targetId === null ? '' : ` · #${shortId(signal.targetId)}`}
        </small>
      )}
      <small>Ocorrido: {signal.occurredAt}</small>
    </li>
  );
}

export function IncidentCenterCard({ client }: { client: IncidentCenterClient }) {
  const [state, setState] = useState<IncidentCenterState>({ status: 'idle' });

  const refresh = async () => {
    setState({ status: 'loading' });
    try {
      const data = await client.getIncidentCenter();
      setState({ status: 'ready', data });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof AdminApiError
            ? 'Não foi possível consultar o Incident Center.'
            : 'A resposta do Incident Center não pôde ser validada.',
        correlationId: error instanceof AdminApiError ? error.correlationId : null,
      });
    }
  };

  const data = state.status === 'ready' ? state.data : null;

  return (
    <section className="runtime-health-card" aria-labelledby="incident-center-title">
      <div className="runtime-health-heading">
        <div>
          <span className="eyebrow">INCIDENTES</span>
          <h3 id="incident-center-title">Incident Center</h3>
        </div>
        <button
          className="secondary-button runtime-health-refresh"
          disabled={state.status === 'loading'}
          onClick={() => void refresh()}
          type="button"
        >
          {state.status === 'loading' ? 'Consultando…' : 'Atualizar incidentes'}
        </button>
      </div>

      {state.status === 'idle' ? (
        <div className="runtime-health-empty">
          <strong>Ainda não consultado.</strong>
          <p>Sinais correlacionados aparecem somente após consulta explícita.</p>
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <p className="runtime-health-empty" role="status">
          Consultando sinais operacionais…
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
        <div className="runtime-health-empty">
          <strong>Sinais recentes</strong>
          {data.signals.length === 0 ? (
            <p>Nenhum sinal registrado.</p>
          ) : (
            <ul>
              {data.signals.map((signal) => (
                <IncidentRow key={`${signal.source}:${signal.id}`} signal={signal} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
