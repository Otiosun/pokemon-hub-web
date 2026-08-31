import { useRef, useState } from 'react';
import { AdminDrawer } from '../../components/shell/AdminDrawer';
import type {
  AdminApiClient,
  AdminPrepareOperationResult,
  Player360Overview,
} from '../../lib/api/admin-api';
import { AdminApiError } from '../../lib/api/admin-api';
import {
  type BattleForceCancelPrepareContext,
  buildBattleForceCancelPrepareRequest,
} from './battle-force-cancel-prepare';
import { parsePlayer360BattleContext } from './player360-battle';
import {
  type PrepareIdempotencyState,
  resolvePrepareIdempotency,
} from './prepare-idempotency';

interface PrepareErrorView {
  readonly message: string;
  readonly correlationId: string | null;
}

function prepareError(error: unknown): PrepareErrorView {
  if (error instanceof AdminApiError) {
    return { message: error.message, correlationId: error.correlationId };
  }
  return {
    message: 'Não foi possível preparar o cancelamento da batalha.',
    correlationId: null,
  };
}

function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Secure random UUID is unavailable for administrative preparation.');
  }
  return `battle-cancel:${globalThis.crypto.randomUUID()}`;
}

export async function prepareBattleForceCancel(
  client: Pick<AdminApiClient, 'prepareOperation'>,
  context: BattleForceCancelPrepareContext,
): Promise<AdminPrepareOperationResult> {
  return client.prepareOperation(buildBattleForceCancelPrepareRequest(context));
}

export function BattleForceCancelPrepareDrawer({
  client,
  onClose,
  player,
}: {
  readonly client: Pick<AdminApiClient, 'prepareOperation'>;
  readonly onClose: () => void;
  readonly player: Player360Overview;
}) {
  const battle = parsePlayer360BattleContext(player).activeBattle;
  const idempotency = useRef<PrepareIdempotencyState | null>(null);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'preparing' | 'prepared' | 'error'>('idle');
  const [prepared, setPrepared] = useState<AdminPrepareOperationResult | null>(null);
  const [error, setError] = useState<PrepareErrorView | null>(null);

  if (battle === null) {
    return (
      <AdminDrawer
        description="O contexto mudou antes da preparação. Nenhuma operação foi criada."
        eyebrow="BATTLE · PREPARE ONLY"
        onClose={onClose}
        title="Batalha ativa não encontrada"
      >
        <div className="request-error" role="alert">
          <strong>Atualize o Player 360 antes de tentar novamente.</strong>
          <span>
            O backend continuará revalidando target e authority em qualquer nova tentativa.
          </span>
        </div>
      </AdminDrawer>
    );
  }

  const activeBattle = battle;
  const canPrepare =
    reason.trim().length > 0 && reason.trim().length <= 2000 && status !== 'preparing';

  function changeReason(value: string) {
    setReason(value);
    setPrepared(null);
    setError(null);
    setStatus('idle');
  }

  async function submitPrepare() {
    if (!canPrepare) return;
    const normalizedReason = reason.trim();
    const fingerprint = JSON.stringify({
      playerId: player.playerId,
      battleId: activeBattle.id,
      battleVersion: activeBattle.version,
      reason: normalizedReason,
    });
    const resolvedIdempotency = resolvePrepareIdempotency(
      idempotency.current,
      fingerprint,
      newIdempotencyKey,
    );
    idempotency.current = resolvedIdempotency.state;

    setStatus('preparing');
    setError(null);
    try {
      const result = await prepareBattleForceCancel(client, {
        playerId: player.playerId,
        battleId: activeBattle.id,
        battleVersion: activeBattle.version,
        reason: normalizedReason,
        idempotencyKey: resolvedIdempotency.key,
      });
      setPrepared(result);
      setStatus('prepared');
    } catch (caught) {
      setPrepared(null);
      setError(prepareError(caught));
      setStatus('error');
    }
  }

  return (
    <AdminDrawer
      description="Esta etapa cria apenas uma AdminOperation preparada. Não simula, confirma, aprova nem aplica o cancelamento."
      eyebrow="BATTLE · PREPARE ONLY"
      onClose={onClose}
      title="PREPARAR CANCELAMENTO"
    >
      <section className="player-action-card" aria-label="Contexto do cancelamento">
        <div className="player-action-card-heading">
          <div>
            <span className="panel-kicker">ALVO CONFIRMADO PELO PLAYER 360</span>
            <strong>{player.profile.trainerName ?? 'Treinador sem nome'}</strong>
            <code>{player.playerId}</code>
          </div>
          <span className="risk-badge is-r3">R3</span>
        </div>
        <dl className="foundation-list">
          <div>
            <dt>Batalha</dt>
            <dd>
              <code>{battle.id}</code>
            </dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{battle.status}</dd>
          </div>
          <div>
            <dt>Concorrência</dt>
            <dd>REVISÃO {battle.version}</dd>
          </div>
          <div>
            <dt>Operação</dt>
            <dd>
              <code>battle.force_cancel</code>
            </dd>
          </div>
        </dl>
      </section>

      <label className="control-field">
        <span>Motivo da intervenção</span>
        <textarea
          disabled={status === 'preparing'}
          maxLength={2000}
          onChange={(event) => changeReason(event.target.value)}
          placeholder="Explique o incidente e por que o cancelamento precisa ser preparado."
          rows={5}
          value={reason}
        />
        <small>Obrigatório e persistido na operação administrativa.</small>
      </label>

      <div className="selected-contract-note">
        <strong>Esta ação ainda não altera a batalha.</strong>
        <span>
          Prepare cria evidência auditável; o lifecycle privilegiado posterior permanece fechado no
          HTTP.
        </span>
      </div>

      {error ? (
        <div className="request-error" role="alert">
          <strong>Preparação recusada.</strong>
          <span>{error.message}</span>
          {error.correlationId ? <code>Correlation {error.correlationId}</code> : null}
        </div>
      ) : null}

      {prepared ? (
        <section className="player-action-card" aria-label="Operação preparada">
          <span className="panel-kicker">PREPARADA · NÃO APLICADA</span>
          <strong>{prepared.operation.status}</strong>
          <dl className="foundation-list">
            <div>
              <dt>AdminOperation</dt>
              <dd>
                <code>{prepared.operation.id}</code>
              </dd>
            </div>
            <div>
              <dt>Correlation</dt>
              <dd>
                <code>{prepared.operation.correlationId}</code>
              </dd>
            </div>
            <div>
              <dt>Expected revision</dt>
              <dd>{prepared.operation.expectedRevision ?? '—'}</dd>
            </div>
            <div>
              <dt>Replay idempotente</dt>
              <dd>{prepared.replayed ? 'SIM' : 'NÃO'}</dd>
            </div>
          </dl>
          <span>Nenhuma simulação, confirmação, aprovação ou aplicação foi executada.</span>
        </section>
      ) : null}

      <button
        className="primary-action"
        disabled={!canPrepare}
        onClick={() => void submitPrepare()}
        type="button"
      >
        {status === 'preparing' ? 'Preparando…' : 'Preparar operação'}
      </button>
    </AdminDrawer>
  );
}
