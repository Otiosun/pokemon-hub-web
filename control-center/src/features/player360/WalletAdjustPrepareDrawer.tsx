import { useRef, useState } from 'react';
import { AdminDrawer } from '../../components/shell/AdminDrawer';
import type {
  AdminApiClient,
  AdminPrepareOperationResult,
  Player360Overview,
} from '../../lib/api/admin-api';
import { AdminApiError } from '../../lib/api/admin-api';
import { type Player360WalletView, parsePlayer360Economy } from './player360-economy';
import { type PrepareIdempotencyState, resolvePrepareIdempotency } from './prepare-idempotency';
import {
  buildWalletAdjustPrepareRequest,
  type WalletAdjustPrepareContext,
} from './wallet-adjust-prepare';

interface PrepareErrorView {
  readonly message: string;
  readonly correlationId: string | null;
}

interface PreparedWalletView {
  readonly result: AdminPrepareOperationResult;
  readonly wallet: Player360WalletView;
  readonly delta: string;
}

function prepareError(error: unknown): PrepareErrorView {
  if (error instanceof AdminApiError) {
    return { message: error.message, correlationId: error.correlationId };
  }
  return { message: 'Não foi possível preparar a correção de saldo.', correlationId: null };
}

function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Secure random UUID is unavailable for administrative preparation.');
  }
  return `wallet-adjust:${globalThis.crypto.randomUUID()}`;
}

function validDelta(value: string): boolean {
  const delta = value.trim();
  if (!/^-?[1-9][0-9]*$/.test(delta)) return false;
  try {
    const parsed = BigInt(delta);
    const limit = 9_223_372_036_854_775_807n;
    return parsed >= -limit && parsed <= limit;
  } catch {
    return false;
  }
}

function formatInteger(value: string): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped}`;
}

export async function prepareWalletAdjustment(
  client: Pick<AdminApiClient, 'prepareOperation'>,
  context: WalletAdjustPrepareContext,
): Promise<AdminPrepareOperationResult> {
  return client.prepareOperation(buildWalletAdjustPrepareRequest(context));
}

export function WalletAdjustPrepareDrawer({
  client,
  onClose,
  player,
}: {
  readonly client: Pick<AdminApiClient, 'prepareOperation'>;
  readonly onClose: () => void;
  readonly player: Player360Overview;
}) {
  let wallets: readonly Player360WalletView[] = [];
  let walletContractValid = true;
  try {
    wallets = [...parsePlayer360Economy(player).wallets].sort((left, right) =>
      left.displayName.localeCompare(right.displayName, 'pt-BR'),
    );
  } catch {
    walletContractValid = false;
  }

  const idempotency = useRef<PrepareIdempotencyState | null>(null);
  const [currencyId, setCurrencyId] = useState(wallets[0]?.currencyId ?? '');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'preparing' | 'prepared' | 'error'>('idle');
  const [prepared, setPrepared] = useState<PreparedWalletView | null>(null);
  const [error, setError] = useState<PrepareErrorView | null>(null);

  const selectedWallet = wallets.find((wallet) => wallet.currencyId === currencyId) ?? null;
  const canPrepare =
    walletContractValid &&
    selectedWallet !== null &&
    validDelta(delta) &&
    reason.trim().length > 0 &&
    reason.trim().length <= 2000 &&
    status !== 'preparing';

  function invalidatePreparedIntent() {
    setPrepared(null);
    setError(null);
    setStatus('idle');
  }

  function changeCurrency(value: string) {
    setCurrencyId(value);
    invalidatePreparedIntent();
  }

  function changeDelta(value: string) {
    setDelta(value);
    invalidatePreparedIntent();
  }

  function changeReason(value: string) {
    setReason(value);
    invalidatePreparedIntent();
  }

  async function submitPrepare() {
    if (!canPrepare || selectedWallet === null) return;
    const normalizedDelta = delta.trim();
    const normalizedReason = reason.trim();
    const fingerprint = JSON.stringify({
      playerId: player.playerId,
      currencyId: selectedWallet.currencyId,
      delta: normalizedDelta,
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
      const result = await prepareWalletAdjustment(client, {
        playerId: player.playerId,
        currencyId: selectedWallet.currencyId,
        delta: normalizedDelta,
        reason: normalizedReason,
        idempotencyKey: resolvedIdempotency.key,
      });
      setPrepared({ result, wallet: selectedWallet, delta: normalizedDelta });
      setStatus('prepared');
    } catch (caught) {
      setPrepared(null);
      setError(prepareError(caught));
      setStatus('error');
    }
  }

  return (
    <AdminDrawer
      description="Esta etapa cria apenas uma AdminOperation preparada. A wallet vem do Player 360 validado; nenhum identificador de moeda é digitado manualmente."
      eyebrow="ECONOMIA · PREPARE ONLY"
      onClose={onClose}
      title="PREPARAR CORREÇÃO DE SALDO"
    >
      <section className="player-action-card" aria-label="Contexto da correção de saldo">
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
            <dt>Operação</dt>
            <dd>
              <code>wallet.adjust</code>
            </dd>
          </div>
          <div>
            <dt>Política</dt>
            <dd>R2 · motivo obrigatório</dd>
          </div>
        </dl>
      </section>

      {!walletContractValid ? (
        <div className="request-error" role="alert">
          <strong>Wallets incompatíveis com o contrato atual.</strong>
          <span>
            Atualize o Player 360. Nenhuma operação pode ser preparada com dados não validados.
          </span>
        </div>
      ) : wallets.length === 0 ? (
        <div className="request-error" role="alert">
          <strong>Nenhuma wallet disponível para correção.</strong>
          <span>A Central não permite informar uma moeda inexistente por UUID manual.</span>
        </div>
      ) : (
        <label className="control-field">
          <span>Wallet</span>
          <select
            disabled={status === 'preparing'}
            onChange={(event) => changeCurrency(event.target.value)}
            value={currencyId}
          >
            {wallets.map((wallet) => (
              <option key={wallet.currencyId} value={wallet.currencyId}>
                {wallet.displayName} · {wallet.slug}
              </option>
            ))}
          </select>
          {selectedWallet ? (
            <small>
              Saldo atual: {formatInteger(selectedWallet.amount)} · REV {selectedWallet.revision}
            </small>
          ) : null}
        </label>
      )}

      <label className="control-field">
        <span>Delta de saldo</span>
        <input
          disabled={status === 'preparing' || selectedWallet === null}
          inputMode="numeric"
          onChange={(event) => changeDelta(event.target.value)}
          placeholder="Ex.: 500 ou -500"
          value={delta}
        />
        <small>
          Informe a diferença, não o saldo final. O owner econômico aplica as invariantes.
        </small>
      </label>

      <label className="control-field">
        <span>Motivo da intervenção</span>
        <textarea
          disabled={status === 'preparing' || selectedWallet === null}
          maxLength={2000}
          onChange={(event) => changeReason(event.target.value)}
          placeholder="Explique a origem da correção e a evidência usada pelo suporte."
          rows={5}
          value={reason}
        />
        <small>Obrigatório e persistido na operação administrativa.</small>
      </label>

      <div className="selected-contract-note">
        <strong>Esta ação ainda não altera o saldo.</strong>
        <span>
          Prepare registra uma intenção auditável. Simulação, confirmação, aprovação e aplicação
          continuam fora desta superfície.
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
          <strong>{prepared.result.operation.status}</strong>
          <dl className="foundation-list">
            <div>
              <dt>Wallet</dt>
              <dd>{prepared.wallet.displayName}</dd>
            </div>
            <div>
              <dt>Delta preparado</dt>
              <dd>{formatInteger(prepared.delta)}</dd>
            </div>
            <div>
              <dt>AdminOperation</dt>
              <dd>
                <code>{prepared.result.operation.id}</code>
              </dd>
            </div>
            <div>
              <dt>Correlation</dt>
              <dd>
                <code>{prepared.result.operation.correlationId}</code>
              </dd>
            </div>
            <div>
              <dt>Replay idempotente</dt>
              <dd>{prepared.result.replayed ? 'SIM' : 'NÃO'}</dd>
            </div>
          </dl>
          <span>Nenhum saldo foi alterado por este drawer.</span>
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
