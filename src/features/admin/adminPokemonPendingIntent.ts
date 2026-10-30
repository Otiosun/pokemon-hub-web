import type { AdminOperationPrepareInput } from '../../player-api/playerPortalAdminOperationsClient';

export type PendingAdminPokemonOperation = {
  readonly playerId: string;
  readonly request: AdminOperationPrepareInput;
  readonly createdAt: number;
};
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Session-scoped uncertain request. This is NOT proof of success: only the
 * backend operation replay/audit can resolve the original request.
 * Persist before the network call, so reloads cannot mint a duplicate grant.
 */
export function encodePendingAdminPokemonOperation(
  playerId: string,
  request: AdminOperationPrepareInput,
  now = Date.now(),
): string {
  if(!ID.test(playerId) || !ID.test(request.requestId) ||
     request.input.playerId !== playerId || typeof request.operationType !== 'string' ||
     !request.operationType.startsWith('pokemon.')) {
    throw new Error('Cannot persist an unscoped admin Pokémon mutation');
  }
  return JSON.stringify({version:1,playerId,request,createdAt:now});
}

export function decodePendingAdminPokemonOperation(
  raw: string | null,
  playerId: string,
  now = Date.now(),
): PendingAdminPokemonOperation | null {
  if(!raw)return null;
  let value:unknown;
  try { value=JSON.parse(raw) as unknown; } catch { return null; }
  if(typeof value!=='object'||value===null||Array.isArray(value))return null;
  const record=value as Record<string,unknown>;
  if(record.version!==1||record.playerId!==playerId||!ID.test(playerId))return null;
  // A previous request can remain uncertain after 12 hours or longer.
  // Never silently expire it and permit a new request ID: only a server-side
  // terminal outcome may clear a pending financial/mechanical mutation.
  if(typeof record.createdAt!=='number'||!Number.isFinite(record.createdAt)||
     record.createdAt>now)return null;
  const request=record.request;
  if(typeof request!=='object'||request===null||Array.isArray(request))return null;
  const payload=request as Record<string,unknown>;
  if(typeof payload.requestId!=='string'||!ID.test(payload.requestId)||
    typeof payload.operationType!=='string'||!payload.operationType.startsWith('pokemon.')||
    typeof payload.input!=='object'||payload.input===null||Array.isArray(payload.input)||
    (payload.input as Record<string,unknown>).playerId!==playerId ||
    typeof payload.reason!=='string'||!payload.reason.trim())return null;
  return {playerId,request:payload as AdminOperationPrepareInput,createdAt:record.createdAt};
}

export function pendingAdminPokemonStorageKey(playerId:string):string {
  if(!ID.test(playerId))throw new Error('Invalid player scope for pending admin request');
  return 'pokemon-beyond.admin.pokemon.pending.v1:'+playerId;
}
