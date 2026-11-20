import {
  isAdvancedShowcaseActive,
  readAdvancedShowcaseMoveChoices,
  resolveAdvancedShowcaseMoveChoice,
} from '../showcase/advancedShowcase';
import type { PlayerPortalFetcher } from './playerPortalClient';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVISION_PATTERN = /^(0|[1-9]\d{0,18})$/;
export function isMoveChoiceRevision(value: unknown): value is string {
  return typeof value === 'string' && REVISION_PATTERN.test(value) && BigInt(value) <= 9223372036854775807n;
}
export type PlayerPortalPendingMove = { slotNo: number; moveId: string; displayName: string };
// Optional at the shared type boundary because the existing showcase fixtures are local-only.
// Actual authenticated GET/POST lists require an exact decimal revision.
export type PlayerPortalPendingMoveChoice = {
  choiceId: string;
  pokemonInstanceId: string;
  pokemonDisplayName: string;
  learnLevel: number;
  moveId: string;
  moveDisplayName: string;
  currentMoves: PlayerPortalPendingMove[];
  revision?: string;
};
export type PlayerPortalMoveChoicesResult =
  | { status: 'authenticated'; blockedByBattle: boolean; choices: PlayerPortalPendingMoveChoice[] }
  | { status: 'unauthenticated' };
export type PlayerPortalResolvedMoveChoice = {
  choiceId: string; pokemonInstanceId: string; moveId: string;
  status: 'RESOLVED' | 'SKIPPED'; replacedSlotNo: number | null; replayed: boolean;
};
export type PlayerPortalMoveChoiceRequest = {
  choiceId: string; replaceSlotNo: number | null; expectedPokemonRevision: string;
};
export type PlayerPortalResolveMoveChoiceResult =
  | { status: 'authenticated'; result: PlayerPortalResolvedMoveChoice; blockedByBattle: boolean; choices: PlayerPortalPendingMoveChoice[]; refreshRequired?: false }
  | { status: 'authenticated'; result: PlayerPortalResolvedMoveChoice; refreshRequired: true }
  | { status: 'unauthenticated' } | { status: 'blocked' } | { status: 'stale' };

function showcaseRevisions(choices: readonly PlayerPortalPendingMoveChoice[]): PlayerPortalPendingMoveChoice[] {
  // No synthetic value can enter the real HTTP path. Showcase is not a server session.
  return choices.map((choice) => ({ ...choice, revision: '0' }));
}
export async function getPlayerPortalMoveChoices(fetcher: PlayerPortalFetcher = fetch): Promise<PlayerPortalMoveChoicesResult> {
  if (isAdvancedShowcaseActive()) return { status: 'authenticated', blockedByBattle: false, choices: showcaseRevisions(readAdvancedShowcaseMoveChoices()) };
  const response = await fetcher('/api/hub/player/move-choices', {
    method: 'GET', credentials: 'include', headers: { accept: 'application/json' },
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) throw new Error(`Player portal move choices failed (${response.status})`);
  const body = await readJson(response);
  if (!isRecord(body) || typeof body.blockedByBattle !== 'boolean' || !Array.isArray(body.choices) || !body.choices.every(isPendingMoveChoice)) {
    throw new Error('Invalid player portal move choices response');
  }
  return { status: 'authenticated', blockedByBattle: body.blockedByBattle, choices: body.choices };
}
export async function resolvePlayerPortalMoveChoice(input: PlayerPortalMoveChoiceRequest, fetcher: PlayerPortalFetcher = fetch): Promise<PlayerPortalResolveMoveChoiceResult> {
  if (!UUID_PATTERN.test(input.choiceId) || !isMoveChoiceRevision(input.expectedPokemonRevision) ||
      (input.replaceSlotNo !== null && (!Number.isInteger(input.replaceSlotNo) || input.replaceSlotNo < 1 || input.replaceSlotNo > 4))) {
    throw new Error('Invalid player portal move choice request');
  }
  if (isAdvancedShowcaseActive()) {
    const resolved = resolveAdvancedShowcaseMoveChoice(input.choiceId, input.replaceSlotNo);
    if (!resolved) return { status: 'stale' };
    return { status: 'authenticated', result: resolved.result, blockedByBattle: false, choices: showcaseRevisions(resolved.choices) };
  }
  // Encode once; both attempts send precisely the human-confirmed intent.
  const payload = JSON.stringify({ choiceId: input.choiceId, replaceSlotNo: input.replaceSlotNo, expectedPokemonRevision: input.expectedPokemonRevision });
  const send = () => fetcher('/api/hub/player/move-choices/resolve', {
    method: 'POST', credentials: 'include', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: payload,
  });
  let response: Response;
  try { response = await send(); } catch { response = await send(); }
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 404) return { status: 'stale' };
  if (response.status === 409) {
    const body = await readJson(response);
    if (isRecord(body) && body.error === 'FLOW_BLOCKED') return { status: 'blocked' };
    return { status: 'stale' }; // no silent revision rebinding
  }
  if (!response.ok) throw new Error(`Player portal move choice failed (${response.status})`);
  const body = await readJson(response);
  if (!isRecord(body) || !isResolvedMoveChoice(body.result) || body.result.choiceId !== input.choiceId || body.result.replacedSlotNo !== input.replaceSlotNo) {
    throw new Error('Invalid player portal move choice receipt');
  }
  // A valid durable receipt is success even if the separate projection is unavailable.
  if (body.refreshRequired === true || typeof body.blockedByBattle !== 'boolean' || !Array.isArray(body.choices) || !body.choices.every(isPendingMoveChoice)) {
    return { status: 'authenticated', result: body.result, refreshRequired: true };
  }
  return { status: 'authenticated', result: body.result, blockedByBattle: body.blockedByBattle, choices: body.choices };
}
function isPendingMoveChoice(value: unknown): value is PlayerPortalPendingMoveChoice {
  if (!isRecord(value)) return false;
  return isUuid(value.choiceId) && isUuid(value.pokemonInstanceId) && isDisplayString(value.pokemonDisplayName) &&
    typeof value.learnLevel === 'number' && Number.isInteger(value.learnLevel) && value.learnLevel >= 1 && value.learnLevel <= 100 &&
    isUuid(value.moveId) && isDisplayString(value.moveDisplayName) && isMoveChoiceRevision(value.revision) &&
    Array.isArray(value.currentMoves) && value.currentMoves.length <= 4 && value.currentMoves.every(isPendingMove);
}
function isPendingMove(value: unknown): value is PlayerPortalPendingMove {
  if (!isRecord(value)) return false;
  return typeof value.slotNo === 'number' && Number.isInteger(value.slotNo) && value.slotNo >= 1 && value.slotNo <= 4 && isUuid(value.moveId) && isDisplayString(value.displayName);
}
function isResolvedMoveChoice(value: unknown): value is PlayerPortalResolvedMoveChoice {
  if (!isRecord(value)) return false;
  return isUuid(value.choiceId) && isUuid(value.pokemonInstanceId) && isUuid(value.moveId) &&
    (value.status === 'RESOLVED' || value.status === 'SKIPPED') &&
    (value.replacedSlotNo === null || (typeof value.replacedSlotNo === 'number' && Number.isInteger(value.replacedSlotNo) && value.replacedSlotNo >= 1 && value.replacedSlotNo <= 4)) && typeof value.replayed === 'boolean';
}
async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { throw new Error('Invalid player portal move choices response'); }
}
function isUuid(value: unknown): value is string { return typeof value === 'string' && UUID_PATTERN.test(value); }
function isDisplayString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
