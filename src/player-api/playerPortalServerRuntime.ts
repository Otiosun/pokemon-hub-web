import { resolvePremiumStagingApiBaseUrl } from './premiumStagingBoundary.js';
import { resolvePremiumLocalApiBaseUrl } from './premiumLocalBoundary.js';

const PLAYER_PORTAL_API_BASE_URL = 'PLAYER_PORTAL_API_BASE_URL';

function readRuntimeEnv(name: string): string | null {
  const runtimeProcess = Reflect.get(globalThis, 'process');
  if (typeof runtimeProcess !== 'object' || runtimeProcess === null) return null;
  const environment = Reflect.get(runtimeProcess, 'env');
  if (typeof environment !== 'object' || environment === null) return null;
  const value = Reflect.get(environment, name);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function readPlayerPortalApiBaseUrl(): string | null {
  return readRuntimeEnv(PLAYER_PORTAL_API_BASE_URL);
}

/** Never fallback to PLAYER_PORTAL_API_BASE_URL for Premium preview calls. */
export function readPremiumStagingApiBaseUrl(): string | null {
  return resolvePremiumStagingApiBaseUrl({
    vercelEnv: readRuntimeEnv('VERCEL_ENV'),
    enabled: readRuntimeEnv('PREMIUM_STAGING_ENABLED'),
    apiBaseUrl: readRuntimeEnv('PREMIUM_STAGING_API_BASE_URL'),
    approvedOrigin: readRuntimeEnv('PREMIUM_STAGING_APPROVED_ORIGIN'),
    productionApiBaseUrl: readPlayerPortalApiBaseUrl(),
  });
}

/** Manual Premium transport: stage preview or explicitly approved local-PC API; never both. */
export function readPremiumManualApiBaseUrl(): string | null {
  const mode = readRuntimeEnv('VERCEL_ENV');
  if (mode === 'preview') return readPremiumStagingApiBaseUrl();
  if (mode !== 'production') return null;
  return resolvePremiumLocalApiBaseUrl({
    vercelEnv: mode,
    enabled: readRuntimeEnv('PREMIUM_LOCAL_ENABLED'),
    approvedOrigin: readRuntimeEnv('PREMIUM_LOCAL_APPROVED_ORIGIN'),
    apiBaseUrl: readPlayerPortalApiBaseUrl(),
  });
}
