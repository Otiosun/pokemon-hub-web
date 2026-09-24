import {
  advanceAdminOperation,
  prepareAdminOperation,
  type AdminOperationMutationResult,
  type AdminOperationPrepareInput,
} from '../../player-api/playerPortalAdminOperationsClient';
import type { AdminPlayer360 } from '../../player-api/playerPortalAdminPlayersClient';

export type AdminRepairAction = 'BATTLE_CANCEL' | 'ENCOUNTER_CLOSE';

export type AdminRepairBuildResult =
  | { ok: true; request: AdminOperationPrepareInput }
  | { ok: false; message: string };

export type AdminRepairRunResult =
  | { status: 'applied'; operationId: string; result: Record<string, unknown> | null }
  | { status: 'awaiting-approval'; operationId: string }
  | { status: 'denied' }
  | { status: 'rejected'; code: string };

export function capabilityForRepair(action: AdminRepairAction) {
  return action === 'BATTLE_CANCEL' ? 'battle.force_cancel' : 'encounter.force_close';
}

export function buildAdminRepairOperation(input: {
  action: AdminRepairAction;
  playerId: string;
  activeBattle: AdminPlayer360['activeBattle'];
  activeEncounter: AdminPlayer360['activeEncounter'];
  reason: string;
  requestId: string;
}): AdminRepairBuildResult {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, message: 'O motivo administrativo é obrigatório.' };

  if (input.action === 'BATTLE_CANCEL') {
    const battle = input.activeBattle;
    if (battle === null) return { ok: false, message: 'Não há batalha ativa para cancelar.' };
    if (battle.battleType === 'PVP') {
      return {
        ok: false,
        message: 'Cancelamento administrativo por jogador não é permitido para batalha PVP.',
      };
    }
    if (battle.status !== 'ACTIVE') {
      return {
        ok: false,
        message: `A batalha está em ${battle.status}; somente ACTIVE pode ser cancelada.`,
      };
    }

    return {
      ok: true,
      request: {
        requestId: input.requestId,
        operationType: 'battle.force_cancel',
        input: { playerId: input.playerId, battleId: battle.id },
        reason,
        expectedRevision: battle.version,
      },
    };
  }

  const encounter = input.activeEncounter;
  if (encounter === null) return { ok: false, message: 'Não há encontro ativo para encerrar.' };
  if (encounter.status === 'IN_BATTLE' && input.activeBattle !== null) {
    return {
      ok: false,
      message: 'Cancele ou resolva a batalha ativa antes de encerrar este encontro.',
    };
  }

  return {
    ok: true,
    request: {
      requestId: input.requestId,
      operationType: 'encounter.close',
      input: { playerId: input.playerId, encounterId: encounter.id },
      reason,
      expectedRevision: encounter.revision,
    },
  };
}

function deniedOrRejected(
  result: AdminOperationMutationResult,
): AdminRepairRunResult | null {
  if (result.status === 'unauthenticated' || result.status === 'forbidden') {
    return { status: 'denied' };
  }
  if (result.status === 'rejected') return { status: 'rejected', code: result.code };
  return null;
}

type AdminRepairDependencies = {
  prepare: typeof prepareAdminOperation;
  advance: typeof advanceAdminOperation;
};

const DEFAULT_DEPENDENCIES: AdminRepairDependencies = {
  prepare: prepareAdminOperation,
  advance: advanceAdminOperation,
};

export async function runAdminRepairOperation(
  request: AdminOperationPrepareInput,
  dependencies: AdminRepairDependencies = DEFAULT_DEPENDENCIES,
): Promise<AdminRepairRunResult> {
  let current = await dependencies.prepare(request);
  const initialFailure = deniedOrRejected(current);
  if (initialFailure) return initialFailure;

  for (let step = 0; step < 5; step += 1) {
    if (current.status !== 'ok') {
      const failure = deniedOrRejected(current);
      if (failure) return failure;
      return { status: 'rejected', code: 'ADMIN_OPERATION_UNKNOWN_RESULT' };
    }

    if (current.operationStatus === 'APPLIED') {
      return { status: 'applied', operationId: current.operationId, result: current.result };
    }
    if (current.operationStatus === 'PENDING_APPROVAL') {
      return { status: 'awaiting-approval', operationId: current.operationId };
    }
    if (current.operationStatus === 'VALIDATED') {
      current = await dependencies.advance(current.operationId, 'simulate');
    } else if (
      current.operationStatus === 'SIMULATED' ||
      current.operationStatus === 'PENDING_CONFIRMATION'
    ) {
      current = await dependencies.advance(current.operationId, 'confirm');
    } else if (current.operationStatus === 'READY') {
      current = await dependencies.advance(current.operationId, 'apply');
    } else {
      return { status: 'rejected', code: `ADMIN_OPERATION_${current.operationStatus}` };
    }

    const failure = deniedOrRejected(current);
    if (failure) return failure;
  }

  return { status: 'rejected', code: 'ADMIN_OPERATION_STEP_LIMIT' };
}
