import { useRef, useState } from 'react';
import { AdminDrawer } from '../../components/shell/AdminDrawer';
import type {
  AdminApiClient,
  AdminPrepareOperationResult,
  Player360Overview,
} from '../../lib/api/admin-api';
import { AdminApiError } from '../../lib/api/admin-api';
import {
  buildInventoryAdjustPrepareRequest,
  type InventoryAdjustPrepareContext,
} from './inventory-adjust-prepare';
import { type Player360InventoryView, parsePlayer360Economy } from './player360-economy';
import { type PrepareIdempotencyState, resolvePrepareIdempotency } from './prepare-idempotency';

interface PrepareErrorView {
  readonly message: string;
  readonly correlationId: string | null;
}

interface PreparedInventoryView {
  readonly result: AdminPrepareOperationResult;
  readonly item: Player360InventoryView;
  readonly delta: string;
}

function prepareError(error: unknown): PrepareErrorView {
  if (error instanceof AdminApiError) {
    return { message: error.message, correlationId: error.correlationId };
  }
  return { message: 'Não foi possível preparar a correção de inventário.', correlationId: null };
}

function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Secure random UUID is unavailable for administrative preparation.');
  }
  return `inventory-adjust:${globalThis.crypto.randomUUID()}`;
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

function humanizeSlug(value: string): string {
  return value
    .split(/[-_:]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatInteger(value: string): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped}`;
}

export async function prepareInventoryAdjustment(
  client: Pick<AdminApiClient, 'prepareOperation'>,
  context: InventoryAdjustPrepareContext,
): Promise<AdminPrepareOperationResult> {
  return client.prepareOperation(buildInventoryAdjustPrepareRequest(context));
}

export function InventoryAdjustPrepareDrawer({
  client,
  onClose,
  player,
}: {
  readonly client: Pick<AdminApiClient, 'prepareOperation'>;
  readonly onClose: () => void;
  readonly player: Player360Overview;
}) {
  let inventory: readonly Player360InventoryView[] = [];
  let inventoryContractValid = true;
  try {
    inventory = [...parsePlayer360Economy(player).inventory].sort((left, right) =>
      left.slug.localeCompare(right.slug),
    );
  } catch {
    inventoryContractValid = false;
  }

  const idempotency = useRef<PrepareIdempotencyState | null>(null);
  const [itemId, setItemId] = useState(inventory[0]?.itemId ?? '');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'preparing' | 'prepared' | 'error'>('idle');
  const [prepared, setPrepared] = useState<PreparedInventoryView | null>(null);
  const [error, setError] = useState<PrepareErrorView | null>(null);

  const selectedItem = inventory.find((item) => item.itemId === itemId) ?? null;
  const canPrepare =
    inventoryContractValid &&
    selectedItem !== null &&
    validDelta(delta) &&
    reason.trim().length > 0 &&
    reason.trim().length <= 2000 &&
    status !== 'preparing';

  function invalidatePreparedIntent() {
    setPrepared(null);
    setError(null);
    setStatus('idle');
  }

  function changeItem(value: string) {
    setItemId(value);
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
    if (!canPrepare || selectedItem === null) return;
    const normalizedDelta = delta.trim();
    const normalizedReason = reason.trim();
    const fingerprint = JSON.stringify({
      playerId: player.playerId,
      itemId: selectedItem.itemId,
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
      const result = await prepareInventoryAdjustment(client, {
        playerId: player.playerId,
        itemId: selectedItem.itemId,
        delta: normalizedDelta,
        reason: normalizedReason,
        idempotencyKey: resolvedIdempotency.key,
      });
      setPrepared({ result, item: selectedItem, delta: normalizedDelta });
      setStatus('prepared');
    } catch (caught) {
      setPrepared(null);
      setError(prepareError(caught));
      setStatus('error');
    }
  }

  return (
    <AdminDrawer
      description="Esta etapa cria apenas uma AdminOperation preparada. O item vem do inventário validado do Player 360; nenhum identificador é digitado manualmente."
      eyebrow="INVENTÁRIO · PREPARE ONLY"
      onClose={onClose}
      title="PREPARAR CORREÇÃO DE INVENTÁRIO"
    >
      <section className="player-action-card" aria-label="Contexto da correção de inventário">
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
              <code>inventory.adjust</code>
            </dd>
          </div>
          <div>
            <dt>Política</dt>
            <dd>R2 · motivo obrigatório</dd>
          </div>
        </dl>
      </section>

      {!inventoryContractValid ? (
        <div className="request-error" role="alert">
          <strong>Inventário incompatível com o contrato atual.</strong>
          <span>
            Atualize o Player 360. Nenhuma operação pode ser preparada com dados não validados.
          </span>
        </div>
      ) : inventory.length === 0 ? (
        <div className="request-error" role="alert">
          <strong>Nenhum item disponível para correção.</strong>
          <span>A Central não permite informar um item inexistente por UUID manual.</span>
        </div>
      ) : (
        <label className="control-field">
          <span>Item</span>
          <select
            disabled={status === 'preparing'}
            onChange={(event) => changeItem(event.target.value)}
            value={itemId}
          >
            {inventory.map((item) => (
              <option key={item.itemId} value={item.itemId}>
                {humanizeSlug(item.slug)} · {item.slug}
              </option>
            ))}
          </select>
          {selectedItem ? (
            <small>
              Quantidade atual: {formatInteger(selectedItem.quantity)} · REV {selectedItem.revision}
            </small>
          ) : null}
        </label>
      )}

      <label className="control-field">
        <span>Delta de quantidade</span>
        <input
          disabled={status === 'preparing' || selectedItem === null}
          inputMode="numeric"
          onChange={(event) => changeDelta(event.target.value)}
          placeholder="Ex.: 3 ou -3"
          value={delta}
        />
        <small>
          Informe a diferença, não a quantidade final. O owner revalida disponibilidade na
          aplicação.
        </small>
      </label>

      <label className="control-field">
        <span>Motivo da intervenção</span>
        <textarea
          disabled={status === 'preparing' || selectedItem === null}
          maxLength={2000}
          onChange={(event) => changeReason(event.target.value)}
          placeholder="Explique a origem da correção e a evidência usada pelo suporte."
          rows={5}
          value={reason}
        />
        <small>Obrigatório e persistido na operação administrativa.</small>
      </label>

      <div className="selected-contract-note">
        <strong>Esta ação ainda não altera o inventário.</strong>
        <span>
          Prepare registra a intenção auditável. Saldo insuficiente, concorrência e demais
          invariantes continuam sendo decididos pelo domínio durante o lifecycle autoritativo.
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
              <dt>Item</dt>
              <dd>{humanizeSlug(prepared.item.slug)}</dd>
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
          <span>Nenhuma quantidade foi alterada por este drawer.</span>
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
