import { useState } from 'react';
import {
  AdminApiError,
  type AdminApiClient,
  type AdminOperationAuditTimelineView,
  type AdminOperationAuditView,
} from '../../lib/api/admin-api';
import '../runtime/runtime-whatsapp-health.css';

type AdminOperationAuditClient = Pick<AdminApiClient, 'getAdminOperationAudit'>;

type AuditState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: AdminOperationAuditView }
  | {
      readonly status: 'error';
      readonly message: string;
      readonly correlationId: string | null;
    };

function shortId(value: string): string {
  return value.slice(0, 8);
}

function yesNo(value: boolean): string {
  return value ? 'Sim' : 'Não';
}

function timelineActor(event: AdminOperationAuditTimelineView): string {
  return event.actorPrincipalId === null ? 'Sistema' : `#${shortId(event.actorPrincipalId)}`;
}

function TimelineEvent({ event }: { event: AdminOperationAuditTimelineView }) {
  return (
    <li>
      <strong>{event.kind}</strong>
      <span>{event.action}</span>
      <small>{event.occurredAt}</small>
      <small>Ator: {timelineActor(event)}</small>
      {event.decision === null ? null : <small>Decisão: {event.decision}</small>}
      {event.resourceType === null ? null : (
        <small>
          Recurso: {event.resourceType}
          {event.resourceId === null ? '' : ` · #${shortId(event.resourceId)}`}
        </small>
      )}
      <small title={event.eventId}>Evento: #{shortId(event.eventId)}</small>
    </li>
  );
}

function AuditResult({ data }: { data: AdminOperationAuditView }) {
  const operation = data.operation;
  return (
    <div className="incident-runbook-body">
      <div className="incident-runbook-intro">
        <strong>
          {operation.operationType} · {operation.status}
        </strong>
        <p>
          Risco R{operation.riskTier} · revisão {operation.revision}
        </p>
        <small title={operation.id}>Operação: #{shortId(operation.id)}</small>
        <small title={operation.correlationId}>
          Correlação: #{shortId(operation.correlationId)}
        </small>
        <small title={operation.principalId}>Principal: #{shortId(operation.principalId)}</small>
        <small>Capability: {operation.capabilityKey}</small>
        <small>
          Alvo: {operation.targetType}
          {operation.targetId === null ? '' : ` · #${shortId(operation.targetId)}`}
        </small>
        <small>Motivo registrado: {yesNo(operation.reasonRecorded)}</small>
        <small>Revisão esperada: {operation.expectedRevision ?? 'não registrada'}</small>
        <small>Criada: {operation.createdAt}</small>
        <small>Atualizada: {operation.updatedAt}</small>
        {operation.appliedAt === null ? null : <small>Aplicada: {operation.appliedAt}</small>}
      </div>

      <details className="incident-runbook">
        <summary>Política registrada</summary>
        <div className="incident-runbook-section">
          <small>Versão: {operation.policy.version}</small>
          <small>Motivo obrigatório: {yesNo(operation.policy.requiresReason)}</small>
          <small>
            Revisão esperada obrigatória: {yesNo(operation.policy.requiresExpectedRevision)}
          </small>
          <small>Simulação exigida: {yesNo(operation.policy.requiresSimulation)}</small>
          <small>Confirmação exigida: {yesNo(operation.policy.requiresConfirmation)}</small>
          <small>Aprovações exigidas: {operation.policy.requiredApprovals}</small>
        </div>
      </details>

      <div className="incident-runbook-section">
        <span>Linha do tempo</span>
        {data.timeline.length === 0 ? (
          <p>Nenhum evento causal adicional registrado.</p>
        ) : (
          <ol>
            {data.timeline.map((event) => (
              <TimelineEvent key={`${event.kind}:${event.eventId}`} event={event} />
            ))}
          </ol>
        )}
      </div>

      <small className="incident-runbook-note">
        Reconstrução somente leitura · os dados exibidos são a projeção allowlisted da Admin API.
      </small>
    </div>
  );
}

export function AdminOperationAuditCard({ client }: { client: AdminOperationAuditClient }) {
  const [operationId, setOperationId] = useState('');
  const [state, setState] = useState<AuditState>({ status: 'idle' });

  const inspect = async () => {
    const requestedOperationId = operationId.trim();
    if (requestedOperationId.length === 0) return;
    setState({ status: 'loading' });
    try {
      const data = await client.getAdminOperationAudit(requestedOperationId);
      setState({ status: 'ready', data });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof AdminApiError
            ? 'Não foi possível reconstruir a auditoria desta operação.'
            : 'A resposta de auditoria não pôde ser validada.',
        correlationId: error instanceof AdminApiError ? error.correlationId : null,
      });
    }
  };

  return (
    <section className="runtime-health-card" aria-labelledby="admin-operation-audit-title">
      <div className="runtime-health-heading">
        <div>
          <span className="eyebrow">AUDITORIA</span>
          <h3 id="admin-operation-audit-title">Reconstrução de AdminOperation</h3>
        </div>
      </div>

      <div className="runtime-health-empty">
        <label htmlFor="admin-operation-audit-id">
          <strong>ID da AdminOperation</strong>
        </label>
        <input
          autoComplete="off"
          id="admin-operation-audit-id"
          onChange={(event) => setOperationId(event.target.value)}
          placeholder="00000000-0000-4000-8000-000000000000"
          spellCheck={false}
          value={operationId}
        />
        <button
          className="secondary-button runtime-health-refresh"
          disabled={state.status === 'loading' || operationId.trim().length === 0}
          onClick={() => void inspect()}
          type="button"
        >
          {state.status === 'loading' ? 'Consultando…' : 'Consultar auditoria'}
        </button>
      </div>

      {state.status === 'idle' ? (
        <div className="runtime-health-empty">
          <strong>Consulta por ID exato.</strong>
          <p>A Central reconstrói somente a operação administrativa informada.</p>
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <p className="runtime-health-empty" role="status">
          Reconstruindo evidência causal…
        </p>
      ) : null}

      {state.status === 'error' ? (
        <div className="runtime-health-error" role="alert">
          <strong>Auditoria indisponível</strong>
          <p>{state.message}</p>
          {state.correlationId === null ? null : <small>Correlação: {state.correlationId}</small>}
        </div>
      ) : null}

      {state.status === 'ready' ? <AuditResult data={state.data} /> : null}
    </section>
  );
}
