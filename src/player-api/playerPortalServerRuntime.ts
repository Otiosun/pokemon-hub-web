const PLAYER_PORTAL_API_BASE_URL = 'PLAYER_PORTAL_API_BASE_URL';

export function readPlayerPortalApiBaseUrl(): string | null {
  const runtimeProcess = Reflect.get(globalThis, 'process');
  if (typeof runtimeProcess !== 'object' || runtimeProcess === null) return null;

  const runtimeEnvironment = Reflect.get(runtimeProcess, 'env');
  if (typeof runtimeEnvironment !== 'object' || runtimeEnvironment === null) return null;

  const value = Reflect.get(runtimeEnvironment, PLAYER_PORTAL_API_BASE_URL);
  if (typeof value !== 'string' || value.trim() === '') return null;
  return value.trim();
}
