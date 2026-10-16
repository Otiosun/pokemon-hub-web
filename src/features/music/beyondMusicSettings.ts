export const BEYOND_MUSIC_STORAGE_KEY = 'pokemon-beyond:music:v1';

export type BeyondMusicSettings = {
  enabled: boolean;
  muted: boolean;
  volume: number;
};

export const DEFAULT_BEYOND_MUSIC_SETTINGS: BeyondMusicSettings = {
  enabled: true,
  muted: false,
  volume: 0.22,
};

export function clampMusicVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_BEYOND_MUSIC_SETTINGS.volume;
  }
  return Math.min(0.65, Math.max(0, value));
}

export function sanitizeBeyondMusicSettings(value: unknown): BeyondMusicSettings {
  if (typeof value !== 'object' || value === null) return DEFAULT_BEYOND_MUSIC_SETTINGS;
  const candidate = value as Record<string, unknown>;
  return {
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : true,
    muted: typeof candidate.muted === 'boolean' ? candidate.muted : false,
    volume: clampMusicVolume(candidate.volume),
  };
}
