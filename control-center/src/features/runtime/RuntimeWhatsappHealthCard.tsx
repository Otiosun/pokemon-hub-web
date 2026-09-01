import { useState } from 'react';
import {
  type AdminApiClient,
  AdminApiError,
  type RuntimeWhatsappHealthView,
  type RuntimeWhatsappProviderState,
} from '../../lib/api/admin-api';
import './runtime-whatsapp-health.css';

type RuntimeHealthClient = Pick<AdminApiClient, 'getRuntimeWhatsappHealth'>;
type RuntimeHealthEnvironment = RuntimeWhatsappHealthView['environment'];

type RuntimeHealthState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: RuntimeWhatsappHealthView }
  | {
      readonly status: 'error';
      readonly message: string;
      readonly correlationId: string | null;
    };

const PROVIDER_STATE_LABELS: Readonly<Record<RuntimeWhatsappProviderState, string>> = {
  STARTING: 'Iniciando',
  CONNECTED: 'Conectado',
  DISCONNECTED: 'Desconectado',
  STOPPED: 'Encerrado',
  INVALIDATED: 'Invalidado',
};

function shortRevision(revision: string): string {
  return revision.slice(0, 8);
}

function timestampLabel(value: string | null): string {
  return value ?? '—';
}

export function RuntimeWhatsappHealthCard({
  client,
  expectedEnvironment,
}: {
  client: RuntimeHealthClient;
  expectedEnvironment: RuntimeHealthEnvironment;
}) {
  const [state, setState] = useState<RuntimeHealthState>({ status: 'idle' });

  const refresh = async () => {
    setState({ status: 'loading' });
    try {
      const data = await client.getRuntimeWhatsappHealth();
      if (data.environment !== expectedEnvironment) {
        setState({
          status: 'error',
          message: 'A Admin API retornou evidência de outro ambiente.',
          correlationId: null,
        });
        return;
      }
      setState({ status: 'ready', data });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof AdminApiError
            ? 'Não foi possível consultar o estado do runtime.'
            : 'A resposta do runtime não pôde ser validada.',
        correlationId: error instanceof AdminApiError ? error.correlationId : null,
      });
    }
  };

  const runtime = state.status === 'ready' ? state.data.runtime : null;

  return (
    <section className="runtime-health-card" aria-labelledby="runtime-whatsapp-title">
      <div className="runtime-health-heading">
        <div>
          <span className="eyebrow">RUNTIME</span>
          <h3 id="runtime-whatsapp-title">Runtime WhatsApp</h3>
        </div>
        <button
          className="secondary-button runtime-health-refresh"
          disabled={state.status === 'loading'}
          onClick={() => void refresh()}
          type="button"
        >
          {state.status === 'loading' ? 'Consultando…' : 'Atualizar estado'}
        </button>
      </div>

      {state.status === 'idle' ? (
        <p className="runtime-health-empty">Ainda não consultado.</p>
      ) : null}

      {state.status === 'loading' ? (
        <p className="runtime-health-empty" role="status">
          Consultando evidência registrada…
        </p>
      ) : null}

      {state.status === 'error' ? (
        <div className="runtime-health-error" role="alert">
          <strong>Consulta indisponível</strong>
          <p>{state.message}</p>
          {state.correlationId === null ? null : <small>Correlação: {state.correlationId}</small>}
        </div>
      ) : null}

      {state.status === 'ready' && runtime === null ? (
        <div className="runtime-health-empty">
          <strong>Sem evidência registrada</strong>
          <p>Nenhuma evidência de runtime foi encontrada neste ambiente.</p>
        </div>
      ) : null}

      {runtime === null ? null : (
        <dl className="runtime-health-facts">
          <div>
            <dt>Estado do provider</dt>
            <dd>{PROVIDER_STATE_LABELS[runtime.providerState]}</dd>
          </div>
          <div>
            <dt>Revisão</dt>
            <dd title={runtime.deploymentRevision}>{shortRevision(runtime.deploymentRevision)}</dd>
          </div>
          <div>
            <dt>Último heartbeat</dt>
            <dd>{timestampLabel(runtime.lastHeartbeatAt)}</dd>
          </div>
          <div>
            <dt>Iniciado em</dt>
            <dd>{timestampLabel(runtime.startedAt)}</dd>
          </div>
          <div>
            <dt>Última conexão</dt>
            <dd>{timestampLabel(runtime.lastConnectedAt)}</dd>
          </div>
          <div>
            <dt>Última desconexão</dt>
            <dd>{timestampLabel(runtime.lastDisconnectAt)}</dd>
          </div>
          <div>
            <dt>Encerrado em</dt>
            <dd>{timestampLabel(runtime.stoppedAt)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
