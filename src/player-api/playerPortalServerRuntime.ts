const PLAYER_PORTAL_API_BASE_URL = 'PLAYER_PORTAL_API_BASE_URL';
const VERCEL_ENV = 'VERCEL_ENV';
const STAGING_PLAYER_API_URL = 'https://stadium-mathematics-disks-honolulu.trycloudflare.com';

export function readPlayerPortalApiBaseUrl(): string | null {
  const runtimeProcess = Reflect.get(globalThis, 'process');
  if (typeof runtimeProcess !== 'object' || runtimeProcess === null) return null;

  const runtimeEnvironment = Reflect.get(runtimeProcess, 'env');
  if (typeof runtimeEnvironment !== 'object' || runtimeEnvironment === null) return null;

  const explicitValue = Reflect.get(runtimeEnvironment, PLAYER_PORTAL_API_BASE_URL);
  if (typeof explicitValue === 'string' && explicitValue.trim() !== '') {
    return explicitValue.trim();
  }

  if (Reflect.get(runtimeEnvironment, VERCEL_ENV) === 'preview') {
    return STAGING_PLAYER_API_URL;
  }

  return null;
}
