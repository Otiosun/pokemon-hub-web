import type { VisualAssetCandidate } from './contracts';

export function pickFirstAvailable(
  candidates: readonly VisualAssetCandidate[],
): VisualAssetCandidate | null {
  return candidates.find((candidate) => candidate.available) ?? null;
}
