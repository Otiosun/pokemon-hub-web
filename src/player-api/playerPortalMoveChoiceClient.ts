import type { PlayerPortalFetcher } from './playerPortalClient';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PlayerPortalPendingMove = {
  slotNo: number;
  moveId: string;
  displayName: string;
};

export type PlayerPortalPendingMoveChoice = {
  choiceId: string;
  pokemonInstanceId: string;
  pokemonDisplayName: string;
  learnLevel: number;
  moveId: string;
  moveDisplayName: string;
  currentMoves: PlayerPortalPendingMove[];
};

export type PlayerPortalMoveChoicesResult =
  | {
      status: 'authenticated';
      blockedByBattle: boolean;
      choices: PlayerPortalPendingMoveChoice[];
    }
  | { status: 'unauthenticated' };

export type PlayerPortalResolvedMoveChoice = {
  choiceId: string;
  pokemonInstanceId: string;
  moveId: string;
  status: 'RESOLVED' | 'SKIPPED';
  replacedSlotNo: number | null;
  replayed: boolean;
};

export type PlayerPortalResolveMoveChoiceResult =
  | {
      status: 'authenticated';
      result: PlayerPortalResolvedMoveChoice;
      blockedByBattle: boolean;
      choices: PlayerPortalPendingMoveChoice[];
    }
  | { status: 'unauthenticated' }
  | { status: 'blocked' }
  | { status: 'stale' };

export async function getPlayerPortalMoveChoices(
  fetcher: PlayerPortalFetcher = fetch,
): Promise<PlayerPortalMoveChoicesResult> {
  const response = await fetcher('/api/hub/player/move-choices', {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) throw new Error(`Player portal move choices failed (${response.status})`);

  const body = await readJson(response);
  if (
    !isRecord(body) ||
    typeof body.blockedByBattle !== 'boolean' ||
    !Array.isArray(body.choices) ||
    !body.choices.every(isPendingMoveChoice)
  ) {
    throw new Error('Invalid player portal move choices response');
  }

  return {
    status: 'authenticated',
    blockedByBattle: body.blockedByBattle,
    choices: body.choices,
  };
}

export async function resolvePlayerPortalMoveChoice(
  input: { choiceId: string; replaceSlotNo: number | null },
  fetcher: PlayerPortalFetcher = fetch,
): Promise<PlayerPortalResolveMoveChoiceResult> {
  if (
    !UUID_PATTERN.test(input.choiceId) ||
    (input.replaceSlotNo !== null &&
      (!Number.isInteger(input.replaceSlotNo) || input.replaceSlotNo < 1 || input.replaceSlotNo > 4))
  ) {
    throw new Error('Invalid player portal move choice request');
  }

  const response = await fetcher('/api/hub/player/move-choices/resolve', {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 404) return { status: 'stale' };
  if (response.status === 409) {
    const body = await readJson(response);
    if (isRecord(body) && body.error === 'FLOW_BLOCKED') return { status: 'blocked' };
    throw new Error('Player portal move choice conflict');
  }
  if (!response.ok) throw new Error(`Player portal move choice failed (${response.status})`);

  const body = await readJson(response);
  if (
    !isRecord(body) ||
    !isResolvedMoveChoice(body.result) ||
    typeof body.blockedByBattle !== 'boolean' ||
    !Array.isArray(body.choices) ||
    !body.choices.every(isPendingMoveChoice)
  ) {
    throw new Error('Invalid player portal move choice response');
  }

  return {
    status: 'authenticated',
    result: body.result,
    blockedByBattle: body.blockedByBattle,
    choices: body.choices,
  };
}

function isPendingMoveChoice(value: unknown): value is PlayerPortalPendingMoveChoice {
  if (!isRecord(value)) return false;
  return (
    isUuid(value.choiceId) &&
    isUuid(value.pokemonInstanceId) &&
    isDisplayString(value.pokemonDisplayName) &&
    Number.isInteger(value.learnLevel) &&
    typeof value.learnLevel === 'number' &&
    value.learnLevel >= 1 &&
    value.learnLevel <= 100 &&
    isUuid(value.moveId) &&
    isDisplayString(value.moveDisplayName) &&
    Array.isArray(value.currentMoves) &&
    value.currentMoves.length <= 4 &&
    value.currentMoves.every(isPendingMove)
  );
}

function isPendingMove(value: unknown): value is PlayerPortalPendingMove {
  if (!isRecord(value)) return false;
  return (
    typeof value.slotNo === 'number' &&
    Number.isInteger(value.slotNo) &&
    value.slotNo >= 1 &&
    value.slotNo <= 4 &&
    isUuid(value.moveId) &&
    isDisplayString(value.displayName)
  );
}

function isResolvedMoveChoice(value: unknown): value is PlayerPortalResolvedMoveChoice {
  if (!isRecord(value)) return false;
  return (
    isUuid(value.choiceId) &&
    isUuid(value.pokemonInstanceId) &&
    isUuid(value.moveId) &&
    (value.status === 'RESOLVED' || value.status === 'SKIPPED') &&
    (value.replacedSlotNo === null ||
      (typeof value.replacedSlotNo === 'number' &&
        Number.isInteger(value.replacedSlotNo) &&
        value.replacedSlotNo >= 1 &&
        value.replacedSlotNo <= 4)) &&
    typeof value.replayed === 'boolean'
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('Invalid player portal move choices response');
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isDisplayString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
