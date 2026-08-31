import { AdminApiError } from '../../lib/api/admin-api';

export type RevisionConflictRefreshStatus = 'idle' | 'refreshing' | 'ready' | 'error';

interface RevisionConflictRecoveryProps {
  readonly targetLabel: string;
  readonly expectedRevision: string;
  readonly currentRevision: string | null;
  readonly correlationId: string | null;
  readonly refreshStatus: RevisionConflictRefreshStatus;
  readonly onRefresh: () => void;
  readonly onReview: () => void;
}

export function isAdminRevisionConflict(error: unknown): error is AdminApiError {
  return error instanceof AdminApiError && error.code === 'ADMIN_REVISION_CONFLICT';
}

export function RevisionConflictRecovery({
  targetLabel,
  expectedRevision,
  currentRevision,
  correlationId,
  refreshStatus,
  onRefresh,
  onReview,
}: RevisionConflictRecoveryProps) {
  const refreshed = refreshStatus === 'ready' && currentRevision !== null;

  return (
    <section className="player-action-card" aria-label="Recuperação de conflito de revisão">
      <span className="panel-kicker">CONFLITO DE REVISÃO</span>
      <strong>O estado mudou antes da alteração.</strong>
      <p>
        O backend recusou a operação porque a revisão usada já não representa o estado atual. Nada
        deve ser forçado ou reaplicado sobre dados antigos.
      </p>

      <dl className="foundation-list">
        <div>
          <dt>Alvo</dt>
          <dd>{targetLabel}</dd>
        </div>
        <div>
          <dt>Revisão usada</dt>
          <dd>{expectedRevision}</dd>
        </div>
        {currentRevision !== null ? (
          <div>
            <dt>Revisão atual</dt>
            <dd>{currentRevision}</dd>
          </div>
        ) : null}
        {correlationId !== null ? (
          <div>
            <dt>Correlation</dt>
            <dd>
              <code>{correlationId}</code>
            </dd>
          </div>
        ) : null}
      </dl>

      {refreshed ? (
        <div className="selected-contract-note">
          <strong>Estado atualizado carregado.</strong>
          <span>Revise o estado atualizado e prepare uma nova operação.</span>
        </div>
      ) : refreshStatus === 'error' ? (
        <div className="request-error" role="alert">
          <strong>O estado atual não pôde ser confirmado.</strong>
          <span>Tente atualizar novamente antes de preparar qualquer nova operação.</span>
        </div>
      ) : (
        <div className="selected-contract-note">
          <strong>Atualização obrigatória antes de continuar.</strong>
          <span>Busque novamente o estado autoritativo do alvo e revise as diferenças.</span>
        </div>
      )}

      {refreshed ? (
        <button className="primary-action" onClick={onReview} type="button">
          Revisar estado atualizado
        </button>
      ) : (
        <button
          className="secondary-action"
          disabled={refreshStatus === 'refreshing'}
          onClick={onRefresh}
          type="button"
        >
          {refreshStatus === 'refreshing' ? 'Atualizando…' : 'Atualizar estado'}
        </button>
      )}
    </section>
  );
}
