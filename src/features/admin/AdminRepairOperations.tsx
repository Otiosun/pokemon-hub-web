import { useState, type FormEvent } from 'react';
import type { AdminPlayer360 } from '../../player-api/playerPortalAdminPlayersClient';
import {
  buildAdminRepairOperation,
  capabilityForRepair,
  runAdminRepairOperation,
  type AdminRepairAction,
} from './adminRepairOperationWorkflow';

type AdminRepairOperationsProps = {
  playerId: string;
  capabilities: readonly string[];
  activeBattle: AdminPlayer360['activeBattle'];
  activeEncounter: AdminPlayer360['activeEncounter'];
  onApplied: () => void;
};

const ACTION_LABEL: Record<AdminRepairAction, string> = {
  BATTLE_CANCEL: 'CANCELAR BATALHA',
  ENCOUNTER_CLOSE: 'ENCERRAR ENCONTRO',
};

export function AdminRepairOperations({
  playerId,
  capabilities,
  activeBattle,
  activeEncounter,
  onApplied,
}: AdminRepairOperationsProps) {
  const availableActions: AdminRepairAction[] = [];
  if (activeBattle && capabilities.includes(capabilityForRepair('BATTLE_CANCEL'))) {
    availableActions.push('BATTLE_CANCEL');
  }
  if (activeEncounter && capabilities.includes(capabilityForRepair('ENCOUNTER_CLOSE'))) {
    availableActions.push('ENCOUNTER_CLOSE');
  }

  const [selectedAction, setSelectedAction] = useState<AdminRepairAction>(
    availableActions[0] ?? 'BATTLE_CANCEL',
  );
  const activeAction = availableActions.includes(selectedAction)
    ? selectedAction
    : (availableActions[0] ?? null);
  const [reason, setReason] = useState('');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'submitting' }
    | { kind: 'success'; text: string }
    | { kind: 'approval'; text: string }
    | { kind: 'error'; text: string }
  >({ kind: 'idle' });

  if (activeAction === null) {
    return null;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestId = pendingRequestId ?? crypto.randomUUID();
    const built = buildAdminRepairOperation({
      action: activeAction,
      playerId,
      activeBattle,
      activeEncounter,
      reason,
      requestId,
    });

    if (!built.ok) {
      setState({ kind: 'error', text: built.message });
      return;
    }

    if (pendingRequestId === null) setPendingRequestId(requestId);
    setState({ kind: 'submitting' });

    try {
      const result = await runAdminRepairOperation(built.request);
      if (result.status === 'applied') {
        setPendingRequestId(null);
        setReason('');
        setState({
          kind: 'success',
          text: 'Reparo aplicado e registrado na trilha administrativa.',
        });
        onApplied();
        return;
      }
      if (result.status === 'awaiting-approval') {
        setPendingRequestId(null);
        setState({
          kind: 'approval',
          text: 'Este reparo aguarda aprovação de outro administrador.',
        });
        return;
      }
      if (result.status === 'denied') {
        setPendingRequestId(null);
        setState({ kind: 'error', text: 'Sua sessão não possui autorização para este reparo.' });
        return;
      }

      setPendingRequestId(null);
      setState({ kind: 'error', text: `Reparo rejeitado: ${result.code}` });
    } catch {
      setState({
        kind: 'error',
        text: 'Falha de rede. O mesmo requestId será reutilizado na próxima tentativa.',
      });
    }
  };

  const target =
    activeAction === 'BATTLE_CANCEL'
      ? activeBattle
        ? `${activeBattle.battleType} · ${activeBattle.status}`
        : 'sem batalha'
      : activeEncounter
        ? activeEncounter.status
        : 'sem encontro';

  return (
    <section className="admin-player-adjustments admin-repair-operations">
      <header>
        <div>
          <span>REPARAR</span>
          <strong>FLUXOS TRAVADOS</strong>
        </div>
        <small>OPERAÇÃO SENSÍVEL · AUDITADA</small>
      </header>

      <nav aria-label="Reparo administrativo">
        {availableActions.map((action) => (
          <button
            key={action}
            type="button"
            className={activeAction === action ? 'is-active' : ''}
            onClick={() => {
              setSelectedAction(action);
              setReason('');
              setPendingRequestId(null);
              setState({ kind: 'idle' });
            }}
          >
            {ACTION_LABEL[action]}
          </button>
        ))}
      </nav>

      <div className="admin-repair-target">
        <span>ALVO ATUAL</span>
        <strong>{target}</strong>
        {activeAction === 'ENCOUNTER_CLOSE' && activeEncounter?.status === 'IN_BATTLE' && activeBattle ? (
          <small>Cancele/resolva a batalha primeiro. O backend também bloqueará fechamento inseguro.</small>
        ) : null}
        {activeAction === 'BATTLE_CANCEL' && activeBattle?.battleType === 'PVP' ? (
          <small>PVP não pode ser cancelado por esta operação subject-scoped.</small>
        ) : null}
      </div>

      <form onSubmit={submit}>
        <label className="is-reason">
          <span>MOTIVO DO REPARO</span>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setPendingRequestId(null);
              setState({ kind: 'idle' });
            }}
            placeholder="Descreva o problema operacional que justifica este reparo."
            maxLength={2000}
          />
        </label>

        <div className="admin-adjustment-submit">
          <div>
            <span>{ACTION_LABEL[activeAction]}</span>
            <small>{target}</small>
          </div>
          <button
            type="submit"
            className="is-danger"
            disabled={
              state.kind === 'submitting' ||
              (activeAction === 'BATTLE_CANCEL' && activeBattle?.battleType === 'PVP') ||
              (activeAction === 'ENCOUNTER_CLOSE' &&
                activeEncounter?.status === 'IN_BATTLE' &&
                activeBattle !== null)
            }
          >
            {state.kind === 'submitting' ? 'VALIDANDO…' : ACTION_LABEL[activeAction]}
          </button>
        </div>
      </form>

      {state.kind === 'success' ? (
        <p className="admin-adjustment-feedback is-success">{state.text}</p>
      ) : state.kind === 'approval' ? (
        <p className="admin-adjustment-feedback is-approval">{state.text}</p>
      ) : state.kind === 'error' ? (
        <p className="admin-adjustment-feedback is-error">{state.text}</p>
      ) : null}
    </section>
  );
}
