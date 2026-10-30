import {
  advanceAdminOperation,
  prepareAdminOperation,
  type AdminOperationMutationResult,
  type AdminOperationPrepareInput,
} from '../../player-api/playerPortalAdminOperationsClient';
import type { AdminPlayerPokemon } from '../../player-api/playerPortalAdminPlayersClient';

export type AdminPokemonAction = 'ROSTER' | 'PROGRESS' | 'HP' | 'STATUS' | 'ARCHIVE';

export type AdminPokemonOperationFields = {
  placementKind: 'TEAM' | 'BOX';
  boxNo: string;
  slotNo: string;
  level: string;
  xp: string;
  currentHp: string;
  majorStatus: '' | 'BURN' | 'POISON' | 'PARALYSIS' | 'SLEEP' | 'FREEZE';
  statusCounter: string;
};

export type AdminPokemonOperationBuildResult =
  | { ok: true; request: AdminOperationPrepareInput }
  | { ok: false; message: string };

export type AdminPokemonOperationRunResult =
  | { status: 'applied'; operationId: string; result: Record<string, unknown> | null }
  | { status: 'awaiting-approval'; operationId: string }
  | { status: 'denied' }
  | { status: 'rejected'; code: string };

const WHOLE_NUMBER = /^(0|[1-9][0-9]*)$/;
const POSITIVE_NUMBER = /^[1-9][0-9]*$/;

function integerWithin(value: string, min: number, max: number) {
  if (!WHOLE_NUMBER.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function positiveIntegerWithin(value: string, min: number, max: number) {
  if (!POSITIVE_NUMBER.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function capabilityForPokemonAction(action: AdminPokemonAction) {
  if (action === 'ROSTER') return 'pokemon.roster.manage';
  if (action === 'ARCHIVE') return 'pokemon.archive_remove';
  return 'pokemon.edit.mechanics';
}

export function buildAdminPokemonOperation(input: {
  action: AdminPokemonAction;
  playerId: string;
  pokemon: AdminPlayerPokemon;
  fields: AdminPokemonOperationFields;
  reason: string;
  requestId: string;
}): AdminPokemonOperationBuildResult {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, message: 'O motivo administrativo é obrigatório.' };

  const common = {
    playerId: input.playerId,
    pokemonInstanceId: input.pokemon.id,
  };

  let operationType: string;
  let operationInput: Record<string, unknown>;

  if (input.action === 'ROSTER') {
    const slotNo =
      input.fields.placementKind === 'TEAM'
        ? positiveIntegerWithin(input.fields.slotNo, 1, 6)
        : positiveIntegerWithin(input.fields.slotNo, 1, 30);
    if (slotNo === null) {
      return {
        ok: false,
        message:
          input.fields.placementKind === 'TEAM'
            ? 'O slot do time deve estar entre 1 e 6.'
            : 'O slot da Box deve estar entre 1 e 30.',
      };
    }

    if (input.fields.placementKind === 'TEAM') {
      operationInput = {
        ...common,
        target: { placementKind: 'TEAM', boxNo: null, slotNo },
      };
    } else {
      const boxNo = positiveIntegerWithin(input.fields.boxNo, 1, 10_000);
      if (boxNo === null) return { ok: false, message: 'Informe uma Box válida.' };
      operationInput = {
        ...common,
        target: { placementKind: 'BOX', boxNo, slotNo },
      };
    }
    operationType = 'pokemon.roster.move';
  } else if (input.action === 'PROGRESS') {
    const level = integerWithin(input.fields.level, 1, 100);
    const xp = integerWithin(input.fields.xp, 0, Number.MAX_SAFE_INTEGER);
    if (level === null) return { ok: false, message: 'O nível deve estar entre 1 e 100.' };
    if (xp === null) return { ok: false, message: 'Informe um XP inteiro válido.' };
    operationType = 'pokemon.progress.correct';
    operationInput = { ...common, level, xp };
  } else if (input.action === 'HP') {
    const currentHp = integerWithin(input.fields.currentHp, 0, 65_535);
    if (currentHp === null) {
      return { ok: false, message: 'O HP deve ser um inteiro entre 0 e 65535.' };
    }
    operationType = 'pokemon.hp.correct';
    operationInput = { ...common, currentHp };
  } else if (input.action === 'STATUS') {
    const status = input.fields.majorStatus || null;
    let counter: number | null = null;
    if (input.fields.statusCounter.trim()) {
      counter = integerWithin(input.fields.statusCounter.trim(), 0, 10);
      if (counter === null) {
        return { ok: false, message: 'O contador de status deve estar entre 0 e 10.' };
      }
    }
    if (status === null && counter !== null) {
      return { ok: false, message: 'Ao limpar o status, deixe o contador vazio.' };
    }
    operationType = 'pokemon.status.correct';
    operationInput = { ...common, status, counter };
  } else {
    operationType = 'pokemon.archive';
    operationInput = common;
  }

  return {
    ok: true,
    request: {
      requestId: input.requestId,
      operationType,
      input: operationInput,
      reason,
      expectedRevision: input.pokemon.revision,
    },
  };
}

function deniedOrRejected(
  result: AdminOperationMutationResult,
): AdminPokemonOperationRunResult | null {
  if (result.status === 'unauthenticated' || result.status === 'forbidden') {
    return { status: 'denied' };
  }
  if (result.status === 'rejected') return { status: 'rejected', code: result.code };
  return null;
}

type AdminPokemonOperationDependencies = {
  prepare: typeof prepareAdminOperation;
  advance: typeof advanceAdminOperation;
};

const DEFAULT_DEPENDENCIES: AdminPokemonOperationDependencies = {
  prepare: prepareAdminOperation,
  advance: advanceAdminOperation,
};

export async function runAdminPokemonOperation(
  request: AdminOperationPrepareInput,
  dependencies: AdminPokemonOperationDependencies = DEFAULT_DEPENDENCIES,
): Promise<AdminPokemonOperationRunResult> {
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
      return {
        status: 'rejected',
        code: `ADMIN_OPERATION_${current.operationStatus}`,
      };
    }

    const failure = deniedOrRejected(current);
    if (failure) return failure;
  }

  return { status: 'rejected', code: 'ADMIN_OPERATION_STEP_LIMIT' };
}
