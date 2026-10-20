/** Visibility only. Actual authority lives in the server-side origin gate and owner session. */
export type PremiumManualUiMode = 'preview' | 'local' | null;
export function resolvePremiumManualUiMode(input: {
  stageUi?: string;
  stageTarget?: string;
  localUi?: string;
  localTarget?: string;
}): PremiumManualUiMode {
  if (input.stageUi === '1' && input.stageTarget === 'preview' &&
      input.localUi !== '1') return 'preview';
  if (input.localUi === '1' && input.localTarget === 'production' &&
      input.stageUi !== '1') return 'local';
  return null;
}
export function currentPremiumManualUiMode(): PremiumManualUiMode {
  return resolvePremiumManualUiMode({
    stageUi: import.meta.env.VITE_PREMIUM_STAGING_UI,
    stageTarget: import.meta.env.VITE_PREMIUM_STAGING_TARGET,
    localUi: import.meta.env.VITE_PREMIUM_LOCAL_UI,
    localTarget: import.meta.env.VITE_PREMIUM_LOCAL_TARGET,
  });
}
