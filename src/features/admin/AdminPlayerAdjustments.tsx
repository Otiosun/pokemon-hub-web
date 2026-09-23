import { useState, type FormEvent } from 'react';
import {
  adjustAdminPlayer,
  type AdminPlayer360,
  type AdminPlayerAdjustmentInput,
} from '../../player-api/playerPortalAdminPlayersClient';

type AdjustmentKind = 'PROGRESSION' | 'WALLET' | 'INVENTORY';

type AdminPlayerAdjustmentsProps = {
  playerId: string;
  capabilities: readonly string[];
  inventory: AdminPlayer360['inventory'];
  wallets: AdminPlayer360['wallets'];
  onApplied: () => void;
};

const KIND_CAPABILITY: Record<AdjustmentKind, string> = {
  PROGRESSION: 'progression.adjust',
  WALLET: 'wallet.adjust',
  INVENTORY: 'inventory.adjust',
};

const KIND_LABEL: Record<AdjustmentKind, string> = {
  PROGRESSION: 'PROGRESSÃO',
  WALLET: 'WALLET',
  INVENTORY: 'INVENTÁRIO',
};

const SIGNED_DELTA = /^-?[1-9][0-9]*$/;

export function AdminPlayerAdjustments({
  playerId,
  capabilities,
  inventory,
  wallets,
  onApplied,
}: AdminPlayerAdjustmentsProps) {
  const availableKinds = (Object.keys(KIND_CAPABILITY) as AdjustmentKind[]).filter((kind) =>
    capabilities.includes(KIND_CAPABILITY[kind]),
  );
  const [selectedKind, setSelectedKind] = useState<AdjustmentKind>('PROGRESSION');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [itemId, setItemId] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'submitting' }
    | { kind: 'success'; text: string }
    | { kind: 'error'; text: string }
  >({ kind: 'idle' });

  const activeKind = availableKinds.includes(selectedKind)
    ? selectedKind
    : (availableKinds[0] ?? null);
  const resolvedItemId = itemId || inventory[0]?.itemId || '';
  const resolvedCurrencyId = currencyId || wallets[0]?.currencyId || '';

  if (activeKind === null) {
    return (
      <section className="admin-player-adjustments is-disabled">
        <header>
          <div>
            <span>AÇÕES DE MESTRE</span>
            <strong>AJUSTES AUDITADOS</strong>
          </div>
          <small>SEM PERMISSÃO</small>
        </header>
        <p>Esta identidade não possui capabilities de ajuste econômico ou de progressão.</p>
      </section>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanReason = reason.trim();
    if (!SIGNED_DELTA.test(delta.trim())) {
      setState({ kind: 'error', text: 'Informe um delta inteiro diferente de zero.' });
      return;
    }
    if (!cleanReason) {
      setState({ kind: 'error', text: 'O motivo administrativo é obrigatório.' });
      return;
    }
    if (activeKind === 'INVENTORY' && !resolvedItemId) {
      setState({ kind: 'error', text: 'O jogador não possui item selecionável nesta ficha.' });
      return;
    }
    if (activeKind === 'WALLET' && !resolvedCurrencyId) {
      setState({ kind: 'error', text: 'O jogador não possui wallet selecionável nesta ficha.' });
      return;
    }

    const requestId = pendingRequestId ?? crypto.randomUUID();
    if (pendingRequestId === null) setPendingRequestId(requestId);
    setState({ kind: 'submitting' });

    const base = {
      requestId,
      delta: delta.trim(),
      reason: cleanReason,
    };

    const input: AdminPlayerAdjustmentInput =
      activeKind === 'INVENTORY'
        ? { ...base, kind: 'INVENTORY', itemId: resolvedItemId }
        : activeKind === 'WALLET'
          ? { ...base, kind: 'WALLET', currencyId: resolvedCurrencyId }
          : { ...base, kind: 'PROGRESSION' };

    try {
      const result = await adjustAdminPlayer(playerId, input);
      if (result.status === 'ok') {
        setPendingRequestId(null);
        setDelta('');
        setReason('');
        setState({
          kind: 'success',
          text: result.replayed
            ? 'Operação já aplicada anteriormente; replay seguro confirmado.'
            : 'Ajuste aplicado e registrado na trilha administrativa.',
        });
        onApplied();
        return;
      }

      setPendingRequestId(null);
      setState({
        kind: 'error',
        text:
          result.status === 'rejected'
            ? `Operação rejeitada: ${result.code}`
            : 'Sua sessão não possui autorização para esta operação.',
      });
    } catch {
      setState({
        kind: 'error',
        text: 'Falha de rede. O mesmo requestId será reutilizado na próxima tentativa.',
      });
    }
  };

  const switchKind = (kind: AdjustmentKind) => {
    setSelectedKind(kind);
    setPendingRequestId(null);
    setDelta('');
    setReason('');
    setState({ kind: 'idle' });
  };

  return (
    <section className="admin-player-adjustments">
      <header>
        <div>
          <span>AÇÕES DE MESTRE</span>
          <strong>AJUSTES AUDITADOS</strong>
        </div>
        <small>R2 · MOTIVO OBRIGATÓRIO</small>
      </header>

      <nav aria-label="Tipo de ajuste administrativo">
        {availableKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            className={activeKind === kind ? 'is-active' : ''}
            onClick={() => switchKind(kind)}
          >
            {KIND_LABEL[kind]}
          </button>
        ))}
      </nav>

      <form onSubmit={submit}>
        {activeKind === 'INVENTORY' ? (
          <label>
            <span>ITEM EXISTENTE</span>
            <select value={resolvedItemId} onChange={(event) => setItemId(event.target.value)}>
              {inventory.map((item) => (
                <option key={item.itemId} value={item.itemId}>
                  {item.slug} · atual ×{item.quantity}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {activeKind === 'WALLET' ? (
          <label>
            <span>CARTEIRA</span>
            <select
              value={resolvedCurrencyId}
              onChange={(event) => setCurrencyId(event.target.value)}
            >
              {wallets.map((wallet) => (
                <option key={wallet.currencyId} value={wallet.currencyId}>
                  {wallet.displayName} · atual {wallet.amount}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          <span>DELTA</span>
          <input
            inputMode="numeric"
            value={delta}
            onChange={(event) => {
              setDelta(event.target.value);
              setPendingRequestId(null);
            }}
            placeholder="+50 ou -20"
            autoComplete="off"
          />
        </label>

        <label className="is-reason">
          <span>MOTIVO</span>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setPendingRequestId(null);
            }}
            placeholder="Explique por que este ajuste está sendo realizado."
            maxLength={2000}
          />
        </label>

        <div className="admin-adjustment-submit">
          <div>
            <span>{activeKind === 'PROGRESSION' ? 'PONTOS DO TREINADOR' : KIND_LABEL[activeKind]}</span>
            <small>
              {delta.trim() || '0'} · operação registrada com idempotência e auditoria
            </small>
          </div>
          <button type="submit" disabled={state.kind === 'submitting'}>
            {state.kind === 'submitting' ? 'APLICANDO…' : 'APLICAR AJUSTE'}
          </button>
        </div>
      </form>

      {state.kind === 'success' ? (
        <p className="admin-adjustment-feedback is-success">{state.text}</p>
      ) : state.kind === 'error' ? (
        <p className="admin-adjustment-feedback is-error">{state.text}</p>
      ) : null}
    </section>
  );
}
