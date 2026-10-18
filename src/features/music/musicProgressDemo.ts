// Visual demonstration only: never affects audio state or persisted preferences.
export const MUSIC_DEMO_DURATION_MS = 16_000;
export const MUSIC_DEMO_HOLD_MS = 650;

export function demoProgressAt(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(1, elapsedMs / MUSIC_DEMO_DURATION_MS);
}
