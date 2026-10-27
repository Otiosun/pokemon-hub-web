export interface DeliveryPokemonForm {
  formId: string;
  speciesSlug: string;
  formSlug: string;
  displayName: string;
}
export type PokemonDeliveryOutcome =
  | { kind: 'APPLIED'; replayed: boolean; operationId: string }
  | { kind: 'ERROR'; code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'UNAVAILABLE' | 'REJECTED' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function readDeliveryPokemonForms(
  fetcher: typeof fetch = fetch,
): Promise<DeliveryPokemonForm[]> {
  const result = await fetcher('/api/hub/admin/premium/delivery/pokemon', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!result.ok) throw new Error('Catálogo de formas Pokémon indisponível no staging.');
  const payload: unknown = await result.json();
  if (
    !record(payload) ||
    !Array.isArray(payload.forms) ||
    !payload.forms.every(
      (f: unknown) =>
        record(f) &&
        UUID.test(String(f.formId)) &&
        typeof f.speciesSlug === 'string' &&
        typeof f.formSlug === 'string' &&
        typeof f.displayName === 'string',
    )
  )
    throw new Error('Resposta inválida de formas Pokémon.');
  return payload.forms as DeliveryPokemonForm[];
}

export async function deliverSinglePokemon(
  input: {
    requestId: string;
    playerId: string;
    formId: string;
    level: number;
    shiny: boolean;
    reason: string;
  },
  fetcher: typeof fetch = fetch,
): Promise<PokemonDeliveryOutcome> {
  if (
    ![input.requestId, input.playerId, input.formId].every((id) => UUID.test(id)) ||
    !Number.isSafeInteger(input.level) ||
    input.level < 1 ||
    input.level > 100 ||
    typeof input.shiny !== 'boolean' ||
    input.reason.trim().length < 8 ||
    input.reason.trim().length > 400
  )
    throw new Error('Confira os campos antes da concessão.');
  const result = await fetcher('/api/hub/admin/premium/delivery/pokemon', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ ...input, reason: input.reason.trim() }),
  });
  if (result.status === 401) return { kind: 'ERROR', code: 'UNAUTHORIZED' };
  if (result.status === 403) return { kind: 'ERROR', code: 'FORBIDDEN' };
  if ([404, 502, 503].includes(result.status)) return { kind: 'ERROR', code: 'UNAVAILABLE' };
  if (!result.ok) return { kind: 'ERROR', code: 'REJECTED' };
  const payload: unknown = await result.json();
  if (
    !record(payload) ||
    payload.applied !== true ||
    typeof payload.replayed !== 'boolean' ||
    !UUID.test(String(payload.operationId)) ||
    payload.requestId !== input.requestId ||
    payload.playerId !== input.playerId ||
    payload.formId !== input.formId ||
    payload.level !== input.level ||
    payload.shiny !== input.shiny
  ) {
    throw new Error(
      'Entrega não confirmada. Confira o histórico de operações antes de tentar novamente.',
    );
  }
  return { kind: 'APPLIED', replayed: payload.replayed, operationId: String(payload.operationId) };
}
