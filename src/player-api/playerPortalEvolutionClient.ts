import type { PlayerPortalFetcher } from './playerPortalClient';
import { isPlayerPortalPokemon, type PlayerPortalPokemon } from './playerPortalClient';
import { isAdvancedShowcaseActive } from '../showcase/advancedShowcase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PlayerEvolutionTrigger =
  | { kind: 'LEVEL' }
  | { kind: 'CONDITION' }
  | { kind: 'ITEM'; itemId: string };

export type PlayerEvolutionInput = {
  pokemonInstanceId: string;
  requestId: string;
  trigger: PlayerEvolutionTrigger;
};

export type PlayerEvolutionResponse =
  | {
      status: 'applied';
      replayed: boolean;
      toFormId: string;
      pokemon: PlayerPortalPokemon[];
    }
  | { status: 'unauthenticated' | 'not-found' | 'blocked' | 'unavailable' }
  | { status: 'rejected'; code: string };

/** Never change requestId during a retry. Backend ownership and idempotency
 * checks are authoritative, including the atomic consumption of an item. */
export async function requestPlayerEvolution(
  input: PlayerEvolutionInput,
  fetcher: PlayerPortalFetcher = fetch,
  showcaseActive: boolean = isAdvancedShowcaseActive(),
): Promise<PlayerEvolutionResponse> {
  if (
    !UUID.test(input.pokemonInstanceId) ||
    !UUID.test(input.requestId) ||
    !(
      input.trigger.kind === 'LEVEL' ||
      input.trigger.kind === 'CONDITION' ||
      (input.trigger.kind === 'ITEM' && UUID.test(input.trigger.itemId))
    )
  ) throw new Error('Solicitação de evolução inválida.');

  // The showcase is deliberately read-only for evolutionary mutations.
  if (showcaseActive) return { status: 'unavailable' };

  const response = await fetcher('/api/hub/player/pokemon/evolve', {
    method: 'POST',
    credentials: 'include',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 404) return { status: 'not-found' };
  if ([502, 503, 504].includes(response.status)) return { status: 'unavailable' };
  if (response.status === 409) {
    const payload: unknown = await response.json().catch(() => null);
    const code = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : 'ACTION_INVALID';
    return code === 'FLOW_BLOCKED' ? { status: 'blocked' } : { status: 'rejected', code };
  }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const code = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : `HTTP_${response.status}`;
    return { status: 'rejected', code };
  }

  const data: unknown = await response.json().catch(() => null);
  if (
    !isRecord(data) ||
    !isRecord(data.evolution) ||
    !UUID.test(String(data.evolution.toFormId)) ||
    typeof data.evolution.replayed !== 'boolean' ||
    !Array.isArray(data.pokemon) ||
    !data.pokemon.every(isPlayerPortalPokemon)
  ) throw new Error('A API retornou uma evolução em formato inválido.');

  return {
    status: 'applied',
    replayed: data.evolution.replayed,
    toFormId: data.evolution.toFormId as string,
    pokemon: data.pokemon as PlayerPortalPokemon[],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
