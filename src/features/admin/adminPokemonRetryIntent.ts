import type { AdminOperationPrepareInput } from '../../player-api/playerPortalAdminOperationsClient';

export type PendingPokemonAdminIntent = {
  readonly fingerprint: string;
  readonly request: AdminOperationPrepareInput;
};

/** A transport failure doesn't tell the admin whether a grant/effect reached
 * the server. Never replace the retry key or silently change its payload. */
export function keepPokemonAdminIntent(
  pending: PendingPokemonAdminIntent | null,
  proposed: AdminOperationPrepareInput,
):
  | { status: 'ready'; intent: PendingPokemonAdminIntent }
  | { status: 'locked' } {
  const { requestId: _id, ...payload } = proposed;
  const fingerprint = JSON.stringify(payload);
  if (pending !== null) {
    return pending.fingerprint === fingerprint
      ? { status: 'ready', intent: pending }
      : { status: 'locked' };
  }
  return {
    status: 'ready',
    intent: { fingerprint, request: proposed },
  };
}
