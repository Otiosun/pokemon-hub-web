export interface PrepareIdempotencyState {
  readonly fingerprint: string;
  readonly key: string;
}

export function resolvePrepareIdempotency(
  current: PrepareIdempotencyState | null,
  fingerprint: string,
  createKey: () => string,
): { readonly state: PrepareIdempotencyState; readonly key: string } {
  if (current?.fingerprint === fingerprint) {
    return { state: current, key: current.key };
  }

  const state = { fingerprint, key: createKey() } as const;
  return { state, key: state.key };
}
