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

export type PlayerPortalMoveChoiceResolution = {
  choiceId: string;
  pokemonInstanceId: string;
  moveId: string;
  status: 'RESOLVED' | 'SKIPPED';
  replacedSlotNo: number | null;
  replayed: boolean;
};

export type ResolvePlayerPortalMoveChoiceResult =
  | {
      status: 'authenticated';
      result: PlayerPortalMoveChoiceResolution;
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
  if (!response.ok) throw new Error(`Player portal move choices request failed (${response.status})`);

  const body = await readJson(response);
  if (!isMoveChoicesBody(body)) throw new Error('Invalid player portal move choices response');
  return {
    status: 'authenticated',
    blockedByBattle: body.blockedByBattle,
    choices: body.choices,
  };
}

export async function resolvePlayerPortalMoveChoice(
  input: { choiceId: string; replaceSlotNo: number | null },
  fetcher: PlayerPortalFetcher = fetch,
): Promise<ResolvePlayerPortalMoveChoiceResult> {
  if (
    !isUuid(input.choiceId) ||
    (input.replaceSlotNo !== null && !isIntegerBetween(input.replaceSlotNo, 1, 4))
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
  if (response.status === 409) return { status: 'blocked' };
  if (response.status === 404) return { status: 'stale' };
  if (!response.ok) throw new Error(`Player portal move choice request failed (${response.status})`);

  const body = await readJson(response);
  if (!isResolutionBody(body)) throw new Error('Invalid player portal move choice response');
  return {
    status: 'authenticated',
    result: body.result,
    blockedByBattle: body.blockedByBattle,
    choices: body.choices,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('Invalid player portal move choice response');
  }
}

function isMoveChoicesBody(
  value: unknown,
): value is { blockedByBattle: boolean; choices: PlayerPortalPendingMoveChoice[] } {
  if (!isRecord(value)) return false;
  return (
    typeof value.blockedByBattle === 'boolean' &&
    Array.isArray(value.choices) &&
    value.choices.every(isPendingChoice)
  );
}

function isResolutionBody(
  value: unknown,
): value is {
  result: PlayerPortalMoveChoiceResolution;
  blockedByBattle: boolean;
  choices: PlayerPortalPendingMoveChoice[];
} {
  if (!isRecord(value) || !isRecord(value.result)) return false;
  const result = value.result;
  return (
    isUuid(result.choiceId) &&
    isUuid(result.pokemonInstanceId) &&
    isUuid(result.moveId) &&
    (result.status === 'RESOLVED' || result.status === 'SKIPPED') &&
    (result.replacedSlotNo === null || isIntegerBetween(result.replacedSlotNo, 1, 4)) &&
    typeof result.replayed === 'boolean' &&
    typeof value.blockedByBattle === 'boolean' &&
    Array.isArray(value.choices) &&
    value.choices.every(isPendingChoice)
  );
}

function isPendingChoice(value: unknown): value is PlayerPortalPendingMoveChoice {
  if (!isRecord(value)) return false;
  return (
    isUuid(value.choiceId) &&
    isUuid(value.pokemonInstanceId) &&
    isDisplayString(value.pokemonDisplayName) &&
    isPositiveInteger(value.learnLevel) &&
    value.learnLevel <= 100 &&
    isUuid(value.moveId) &&
    isDisplayString(value.moveDisplayName) &&
    Array.isArray(value.currentMoves) &&
    value.currentMoves.length <= 4 &&
    value.currentMoves.every(isPendingMove)
  );
}

function isPendingMove(value: unknown): value is PlayerPortalPendingMove {
  return (
    isRecord(value) &&
    isIntegerBetween(value.slotNo, 1, 4) &&
    isUuid(value.moveId) &&
    isDisplayString(value.displayName)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isDisplayString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
