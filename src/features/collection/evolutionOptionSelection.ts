import type { PlayerEvolutionOption } from '../../player-api/playerPortalEvolutionOptionsClient';

/**
 * The canonical mutation accepts trigger + itemId, not an evolution rule ID.
 * Two target forms with the same trigger would therefore be ambiguous.
 * Fail closed instead of making the UI appear to choose one target while the
 * backend cannot distinguish the intended evolution.
 */
export function evolutionTriggerKey(option: PlayerEvolutionOption): string {
  return option.triggerKind === 'ITEM'
    ? `ITEM:${option.itemId}`
    : option.triggerKind;
}

export function uniqueEvolutionOption(
  options: readonly PlayerEvolutionOption[],
  key: string,
): PlayerEvolutionOption | null {
  const matching = options.filter((option) => evolutionTriggerKey(option) === key);
  return matching.length === 1 ? matching[0] ?? null : null;
}

export function ambiguousEvolutionKeys(
  options: readonly PlayerEvolutionOption[],
): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const option of options) {
    const key = evolutionTriggerKey(option);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
}
