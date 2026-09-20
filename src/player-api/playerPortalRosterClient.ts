import { isAdvancedShowcaseActive } from '../showcase/advancedShowcase';
import type {
  PlayerPortalFetcher,
  PlayerPortalPokemonResult,
  isPlayerPortalPokemon,
} from './playerPortalClient';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PlayerPortalRosterPlacement =
  | { placementKind: 'TEAM'; boxNo: null; slotNo: number }
  | { placementKind: 'BOX'; boxNo: number; slotNo: number };

export type PlayerPortalRosterMoveInput = {
  pokemonInstanceId: string;
  target: PlayerPortalRosterPlacement;
};

export async function movePlayerPortalPokemon(
  input: PlayerPortalRosterMoveInput,
  fetcher: PlayerPortalFetcher = fetch,
  showcaseActive: boolean = isAdvancedShowcaseActive(),
): Promise<PlayerPortalPokemonResult> {
  if (!isRosterMoveInput(input)) {
    throw new Error('Invalid player portal roster request');
  }

  if (showcaseActive) {
    throw new Error('Advanced showcase roster writes are disabled');
  }

  const response = await fetcher('/api/hub/player/roster', {
    method: 'PUT',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) throw new Error(`Player portal roster request failed (${response.status})`);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Invalid player portal roster response');
  }

  if (!isRecord(body) || !Array.isArray(body.pokemon) || !body.pokemon.every(isPlayerPortalPokemon)) {
    throw new Error('Invalid player portal roster response');
  }

  return { status: 'authenticated', pokemon: body.pokemon };
}

function isRosterMoveInput(value: unknown): value is PlayerPortalRosterMoveInput {
  if (!isRecord(value) || !isUuid(value.pokemonInstanceId) || !isRecord(value.target)) return false;

  if (value.target.placementKind === 'TEAM') {
    return value.target.boxNo === null && isIntegerBetween(value.target.slotNo, 1, 6);
  }

  if (value.target.placementKind === 'BOX') {
    return isPositiveInteger(value.target.boxNo) && isPositiveInteger(value.target.slotNo);
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableDisplayName(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.trim().length > 0);
}

function isNullableDex(value: unknown): value is number | null {
  return value === null || isPositiveInteger(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
