import { isAdvancedShowcaseActive } from '../showcase/advancedShowcase';
import type { PlayerPortalFetcher } from './playerPortalClient';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PlayerEvolutionOption = {
  targetDisplayName: string;
  triggerKind: 'LEVEL' | 'ITEM' | 'CONDITION';
  requiredLevel: number | null;
  relativePhysicalStats: 'ATTACK_GT_DEFENSE' | 'ATTACK_LT_DEFENSE' | 'ATTACK_EQ_DEFENSE' | null;
  itemId: string | null;
  itemDisplayName: string | null;
  itemQuantity: string | null;
  conditionActive: boolean | null;
};

export type PlayerEvolutionOptionsState =
  | { status: 'authenticated'; blockedByBattle: boolean; options: PlayerEvolutionOption[] }
  | { status: 'unauthenticated' | 'unavailable' };

export async function getPlayerEvolutionOptions(
  pokemonInstanceId: string,
  fetcher: PlayerPortalFetcher = fetch,
  showcaseActive: boolean = isAdvancedShowcaseActive(),
): Promise<PlayerEvolutionOptionsState> {
  if (!UUID.test(pokemonInstanceId)) throw new Error('Invalid Pokémon instance ID');
  if (showcaseActive) return { status: 'unavailable' };

  const url = `/api/hub/player/pokemon/evolution-options?pokemonInstanceId=${pokemonInstanceId}`;
  const response = await fetcher(url, {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 502 || response.status === 503) return { status: 'unavailable' };
  if (!response.ok) throw new Error(`Evolution options failed (${response.status})`);
  const body: unknown = await response.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.blockedByBattle !== 'boolean' ||
    !Array.isArray(body.options) ||
    !body.options.every(isEvolutionOption)
  ) throw new Error('Invalid evolution options response');
  return { status: 'authenticated', blockedByBattle: body.blockedByBattle, options: body.options };
}

function isEvolutionOption(value: unknown): value is PlayerEvolutionOption {
  if (!isRecord(value)) return false;
  if (typeof value.targetDisplayName !== 'string' || !value.targetDisplayName.trim()) return false;
  if (!['LEVEL', 'ITEM', 'CONDITION'].includes(String(value.triggerKind))) return false;
  if (
    value.relativePhysicalStats !== null &&
    !['ATTACK_GT_DEFENSE', 'ATTACK_LT_DEFENSE', 'ATTACK_EQ_DEFENSE'].includes(
      String(value.relativePhysicalStats),
    )
  ) return false;
  if (value.triggerKind === 'LEVEL') {
    return Number.isInteger(value.requiredLevel) &&
      typeof value.requiredLevel === 'number' &&
      value.requiredLevel >= 2 && value.requiredLevel <= 100 &&
      value.itemId === null && value.itemDisplayName === null &&
      value.itemQuantity === null && value.conditionActive === null;
  }
  if (value.triggerKind === 'ITEM') {
    return value.requiredLevel === null && value.relativePhysicalStats === null &&
      typeof value.itemId === 'string' && UUID.test(value.itemId) &&
      typeof value.itemDisplayName === 'string' && Boolean(value.itemDisplayName.trim()) &&
      typeof value.itemQuantity === 'string' && /^\d+$/.test(value.itemQuantity) &&
      value.conditionActive === null;
  }
  return value.requiredLevel === null && value.relativePhysicalStats === null &&
    value.itemId === null && value.itemDisplayName === null &&
    value.itemQuantity === null && typeof value.conditionActive === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
