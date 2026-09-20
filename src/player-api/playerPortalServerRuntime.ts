const PLAYER_PORTAL_API_BASE_URL = 'PLAYER_PORTAL_API_BASE_URL';

export function readPlayerPortalApiBaseUrl(): string | null {
  const runtimeProcess = Reflect.get(globalThis, 'process');
  if (typeof runtimeProcess !== 'object' || runtimeProcess === null) return null;

  const runtimeEnvironment = Reflect.get(runtimeProcess, 'env');
  if (typeof runtimeEnvironment !== 'object' || runtimeEnvironment === null) return null;

  const explicitValue = Reflect.get(runtimeEnvironment, PLAYER_PORTAL_API_BASE_URL);
  return typeof explicitValue === 'string' && explicitValue.trim() !== ''
    ? explicitValue.trim()
    : null;
}
