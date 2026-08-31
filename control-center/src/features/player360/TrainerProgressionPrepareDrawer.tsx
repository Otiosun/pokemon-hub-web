import { useRef, useState } from 'react';
import { AdminDrawer } from '../../components/shell/AdminDrawer';
import type {
  AdminApiClient,
  AdminPrepareOperationResult,
  Player360Overview,
} from '../../lib/api/admin-api';
import { AdminApiError } from '../../lib/api/admin-api';
import {
  type TrainerProgressionPrepareContext,
  buildTrainerProgressionPrepareRequest,
} from './trainer-progression-prepare';

interface PrepareErrorView {
  readonly message: string;
  readonly correlationId: string | null;
}

function prepareError(error: unknown): PrepareErrorView {
  if (error instanceof AdminApiError) {
    return { message: error.message, correlationId: error.correlationId };
  }
  return {
    message: 'Não foi possível preparar o ajuste de progressão.',
    correlationId: null,
  };
}

function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Secure random UUID is unavailable for administrative preparation.');
  }
  return `progression-adjust:${globalThis.crypto.randomUUID()}`;
}

function validDelta(value: string): boolean {
  const delta = value.trim();
  if (!/^-?[1-9][0-9]*$/.test(delta)) return false;
  try {
    const parsed = BigInt(delta);
    const limit = BigInt(Number.MAX_SAFE_INTEGER);
    return parsed >= -limit && parsed <= limit;
  } catch {
    return false;
  }
}

export async function prepareTrainerProgression(
  client: Pick<AdminApiClient, 'prepareOperation'>,
  context: TrainerProgressionPrepareContext,
): Promise<AdminPrepareOperationResult> {
  return client.prepareOperation(buildTrainerProgressionPrepareRequest(context));
}

export function TrainerProgressionPrepareDrawer({
  client,
  onClose,
  player,
}: {
  readonly client: Pick<AdminApiClient, 'prepareOperation'>;
  readonly onClose: () => void;
  readonly player: Player360Overview;
}) {
  const idempotencyKey = useRef<string | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'preparing' | 'prepared' | 'error'>('idle');
  const [prepared, setPrepared] = useState<AdminPrepareOperationResult | null>(null);
  const [error, setError] = useState<PrepareErrorView | null>(null);

  const canPrepare =
    validDelta(delta) &&
    reason.trim().length > 0 &&
    reason.trim().length <= 2000 &&
    status !== 'preparing';

  async function submitPrepare() {
    if (!canPrepare) return;
    idempotencyKey.current ??= newIdempotencyKey();
    setStatus('preparing');
    setError(null);
    try {
      const result = await prepareTrainerProgression(client, {
        playerId: player.playerId,
        delta,
        reason,
        idempotencyKey: idempotencyKey.current,
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
      description="Esta etapa cria apenas uma AdminOperation preparada. O delta altera pontos de progressão; nível e unlocks continuam sendo calculados pelo domínio."
      eyebrow="PROGRESSÃO · PREPARE ONLY"
      onClose={onClose}
      title="PREPARAR AJUSTE DE PROGRESSÃO"
    >
      <section className="player-action-card" aria-label="Contexto do ajuste de progressão">
        <div className="player-action-card-heading">
          <div>
            <span className="panel-kicker">ALVO CONFIRMADO PELO PLAYER 360</span>
            <strong>{player.profile.trainerName ?? 'Treinador sem nome'}</strong>
            <code>{player.playerId}</code>
          </div>
          <span className="risk-badge is-r2">R2</span>
        </div>
        <dl className="foundation-list">
          <div>
            <dt>Progressão atual</dt>
            <dd>Nível {player.progression.level}</dd>
          </div>
          <div>
            <dt>Pontos atuais</dt>
            <dd>{player.progression.insigniaPoints} pontos</dd>
          </div>
          <div>
            <dt>Operação</dt>
            <dd>
              <code>progression.trainer.adjust</code>
            </dd>
          </div>
          <div>
            <dt>Política</dt>
            <dd>R2 · motivo obrigatório</dd>
          </div>
        </dl>
      </section>

      <label className="control-field">
        <span>Delta de pontos</span>
        <input
          inputMode="numeric"
          onChange={(event) => setDelta(event.target.value)}
          placeholder="Ex.: 250 ou -200"
          value={delta}
        />
        <small>
          Informe somente a diferença. O backend recalcula nível e unlocks pelas regras vigentes.
        </small>
      </label>

      <label className="control-field">
        <span>Motivo da intervenção</span>
        <textarea
          maxLength={2000}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explique a origem da correção e a evidência usada pelo suporte."
          rows={5}
          value={reason}
        />
        <small>Obrigatório e persistido na operação administrativa.</small>
      </label>

      <div className="selected-contract-note">
        <strong>Esta ação ainda não altera a progressão.</strong>
        <span>
          Prepare registra intenção auditável. Nenhuma simulação, confirmação, aprovação ou aplicação
          é executada por este drawer.
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
              <dt>Delta preparado</dt>
              <dd>{delta.trim()} pontos</dd>
            </div>
            <div>
              <dt>Replay idempotente</dt>
              <dd>{prepared.replayed ? 'SIM' : 'NÃO'}</dd>
            </div>
          </dl>
          <span>Nenhuma alteração de nível, pontos ou unlocks foi aplicada.</span>
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
