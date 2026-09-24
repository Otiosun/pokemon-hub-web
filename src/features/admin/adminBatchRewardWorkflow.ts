import {
  advanceAdminOperation,
  prepareAdminOperation,
  type AdminOperationMutationResult,
  type AdminOperationPrepareInput,
} from '../../player-api/playerPortalAdminOperationsClient';
import type { AdminPlayerStatus } from '../../player-api/playerPortalAdminPlayersClient';

export type AdminBatchRewardTarget =
  | { kind: 'PLAYER_IDS'; playerIds: string[] }
  | { kind: 'PLAYER_FILTER'; status: AdminPlayerStatus };

export type AdminBatchReward =
  | { kind: 'TRAINER_PROGRESSION'; delta: string }
  | { kind: 'WALLET'; currencyId: string; delta: string }
  | { kind: 'ITEM'; itemId: string; delta: string };

export type AdminBatchRewardPreview = {
  batchId: string;
  targetCount: number;
  estimatedChunks: number;
  chunkSize: number;
  revision: string;
  sampleTargetIds: string[];
};

export type AdminBatchRewardExecution = {
  batchId: string;
  status: 'COMPLETED' | 'COMPLETED_WITH_ERRORS';
  targetCount: number;
  successCount: number;
  failureCount: number;
  checkpointOrdinal: number;
  revision: string;
  replayed: boolean;
  failures: Array<Record<string, unknown>>;
};

export type AdminBatchRewardRunResult<T> =
  | { status: 'applied'; operationId: string; value: T }
  | { status: 'denied' }
  | { status: 'rejected'; code: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIGNED_DELTA = /^-?[1-9][0-9]*$/;
const WHOLE_NUMBER = /^(0|[1-9][0-9]*)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deniedOrRejected<T>(
  result: AdminOperationMutationResult,
): AdminBatchRewardRunResult<T> | null {
  if (result.status === 'unauthenticated' || result.status === 'forbidden') {
    return { status: 'denied' };
  }
  if (result.status === 'rejected') return { status: 'rejected', code: result.code };
  return null;
}

export function buildBatchRewardPreviewRequest(input: {
  requestId: string;
  target: AdminBatchRewardTarget;
  reward: AdminBatchReward;
  reason: string;
  chunkSize?: number;
}): { ok: true; request: AdminOperationPrepareInput } | { ok: false; message: string } {
  const reason = input.reason.trim();
  const delta = input.reward.delta.trim();
  if (!UUID_PATTERN.test(input.requestId)) {
    return { ok: false, message: 'Identificador de requisição inválido.' };
  }
  if (!reason) return { ok: false, message: 'O motivo administrativo é obrigatório.' };
  if (!SIGNED_DELTA.test(delta)) {
    return { ok: false, message: 'Informe um delta inteiro diferente de zero.' };
  }

  let selector: Record<string, unknown>;
  if (input.target.kind === 'PLAYER_IDS') {
    const playerIds = [...new Set(input.target.playerIds)];
    if (playerIds.length === 0) {
      return { ok: false, message: 'Selecione pelo menos um jogador.' };
    }
    if (playerIds.length > 1000 || playerIds.some((id) => !UUID_PATTERN.test(id))) {
      return { ok: false, message: 'A seleção de jogadores é inválida.' };
    }
    selector = { kind: 'PLAYER_IDS', playerIds };
  } else {
    selector = {
      kind: 'PLAYER_FILTER',
      status: input.target.status,
      limit: 1000,
    };
  }

  let action: Record<string, unknown>;
  if (input.reward.kind === 'TRAINER_PROGRESSION') {
    action = { kind: 'TRAINER_PROGRESSION_ADJUST', delta };
  } else if (input.reward.kind === 'WALLET') {
    if (!UUID_PATTERN.test(input.reward.currencyId)) {
      return { ok: false, message: 'Selecione uma moeda válida.' };
    }
    action = { kind: 'WALLET_ADJUST', currencyId: input.reward.currencyId, delta };
  } else {
    if (!UUID_PATTERN.test(input.reward.itemId)) {
      return { ok: false, message: 'Selecione um item válido.' };
    }
    action = { kind: 'INVENTORY_ADJUST', itemId: input.reward.itemId, delta };
  }

  const chunkSize = input.chunkSize ?? 25;
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 100) {
    return { ok: false, message: 'O tamanho do lote deve estar entre 1 e 100.' };
  }

  return {
    ok: true,
    request: {
      requestId: input.requestId,
      operationType: 'batch.preview',
      input: {
        selector,
        action,
        chunkSize,
      },
      reason,
    },
  };
}

export function buildBatchRewardExecuteRequest(input: {
  requestId: string;
  preview: AdminBatchRewardPreview;
  reason: string;
}): { ok: true; request: AdminOperationPrepareInput } | { ok: false; message: string } {
  const reason = input.reason.trim();
  if (!UUID_PATTERN.test(input.requestId) || !UUID_PATTERN.test(input.preview.batchId)) {
    return { ok: false, message: 'Identificador de execução inválido.' };
  }
  if (!reason) return { ok: false, message: 'O motivo administrativo é obrigatório.' };
  if (!WHOLE_NUMBER.test(input.preview.revision)) {
    return { ok: false, message: 'A revisão do preview é inválida.' };
  }

  return {
    ok: true,
    request: {
      requestId: input.requestId,
      operationType: 'batch.execute.low_risk',
      input: { batchId: input.preview.batchId },
      reason,
      expectedRevision: input.preview.revision,
    },
  };
}

function parsePreview(result: Record<string, unknown> | null): AdminBatchRewardPreview | null {
  if (
    !isRecord(result) ||
    typeof result.batchId !== 'string' ||
    !UUID_PATTERN.test(result.batchId) ||
    typeof result.targetCount !== 'number' ||
    !Number.isInteger(result.targetCount) ||
    result.targetCount < 0 ||
    typeof result.estimatedChunks !== 'number' ||
    !Number.isInteger(result.estimatedChunks) ||
    result.estimatedChunks < 0 ||
    typeof result.chunkSize !== 'number' ||
    !Number.isInteger(result.chunkSize) ||
    result.chunkSize < 1 ||
    result.chunkSize > 100 ||
    typeof result.revision !== 'string' ||
    !WHOLE_NUMBER.test(result.revision) ||
    !Array.isArray(result.sampleTargetIds) ||
    !result.sampleTargetIds.every((id) => typeof id === 'string' && UUID_PATTERN.test(id))
  ) {
    return null;
  }

  return {
    batchId: result.batchId,
    targetCount: result.targetCount,
    estimatedChunks: result.estimatedChunks,
    chunkSize: result.chunkSize,
    revision: result.revision,
    sampleTargetIds: [...result.sampleTargetIds],
  };
}

function parseExecution(result: Record<string, unknown> | null): AdminBatchRewardExecution | null {
  if (
    !isRecord(result) ||
    typeof result.batchId !== 'string' ||
    !UUID_PATTERN.test(result.batchId) ||
    (result.status !== 'COMPLETED' && result.status !== 'COMPLETED_WITH_ERRORS') ||
    typeof result.targetCount !== 'number' ||
    !Number.isInteger(result.targetCount) ||
    typeof result.successCount !== 'number' ||
    !Number.isInteger(result.successCount) ||
    typeof result.failureCount !== 'number' ||
    !Number.isInteger(result.failureCount) ||
    typeof result.checkpointOrdinal !== 'number' ||
    !Number.isInteger(result.checkpointOrdinal) ||
    typeof result.revision !== 'string' ||
    !WHOLE_NUMBER.test(result.revision) ||
    typeof result.replayed !== 'boolean' ||
    !Array.isArray(result.failures) ||
    !result.failures.every(isRecord)
  ) {
    return null;
  }

  return {
    batchId: result.batchId,
    status: result.status,
    targetCount: result.targetCount,
    successCount: result.successCount,
    failureCount: result.failureCount,
    checkpointOrdinal: result.checkpointOrdinal,
    revision: result.revision,
    replayed: result.replayed,
    failures: [...result.failures],
  };
}

type Dependencies = {
  prepare: typeof prepareAdminOperation;
  advance: typeof advanceAdminOperation;
};

const DEFAULT_DEPENDENCIES: Dependencies = {
  prepare: prepareAdminOperation,
  advance: advanceAdminOperation,
};

async function runUntilApplied<T>(
  request: AdminOperationPrepareInput,
  parseValue: (result: Record<string, unknown> | null) => T | null,
  dependencies: Dependencies,
): Promise<AdminBatchRewardRunResult<T>> {
  let current = await dependencies.prepare(request);
  const initialFailure = deniedOrRejected<T>(current);
  if (initialFailure) return initialFailure;

  for (let step = 0; step < 6; step += 1) {
    if (current.status !== 'ok') {
      const failure = deniedOrRejected<T>(current);
      return failure ?? { status: 'rejected', code: 'ADMIN_OPERATION_UNKNOWN_RESULT' };
    }

    if (current.operationStatus === 'APPLIED') {
      const value = parseValue(current.result);
      return value
        ? { status: 'applied', operationId: current.operationId, value }
        : { status: 'rejected', code: 'ADMIN_BATCH_INVALID_RESULT' };
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
    } else if (current.operationStatus === 'PENDING_APPROVAL') {
      return { status: 'rejected', code: 'ADMIN_BATCH_UNEXPECTED_APPROVAL_GATE' };
    } else {
      return { status: 'rejected', code: `ADMIN_OPERATION_${current.operationStatus}` };
    }

    const failure = deniedOrRejected<T>(current);
    if (failure) return failure;
  }

  return { status: 'rejected', code: 'ADMIN_OPERATION_STEP_LIMIT' };
}

export function runBatchRewardPreview(
  request: AdminOperationPrepareInput,
  dependencies: Dependencies = DEFAULT_DEPENDENCIES,
) {
  return runUntilApplied(request, parsePreview, dependencies);
}

export function runBatchRewardExecution(
  request: AdminOperationPrepareInput,
  dependencies: Dependencies = DEFAULT_DEPENDENCIES,
) {
  return runUntilApplied(request, parseExecution, dependencies);
}
