import { afterEach, describe, expect, it } from 'vitest';
import { readPlayerPortalApiBaseUrl } from './playerPortalServerRuntime';

const STAGING_PLAYER_API_URL = 'https://pokemon-rpg-player-api-staging-staging.up.railway.app';

function runtimeEnvironment(): Record<string, unknown> {
  const runtimeProcess = Reflect.get(globalThis, 'process');
  if (typeof runtimeProcess !== 'object' || runtimeProcess === null) {
    throw new Error('process is unavailable in the test runtime');
  }

  const environment = Reflect.get(runtimeProcess, 'env');
  if (typeof environment !== 'object' || environment === null) {
    throw new Error('process.env is unavailable in the test runtime');
  }

  return environment as Record<string, unknown>;
}

const originalPlayerPortalBaseUrl = runtimeEnvironment().PLAYER_PORTAL_API_BASE_URL;
const originalVercelEnvironment = runtimeEnvironment().VERCEL_ENV;

afterEach(() => {
  const environment = runtimeEnvironment();
  if (originalPlayerPortalBaseUrl === undefined) {
    Reflect.deleteProperty(environment, 'PLAYER_PORTAL_API_BASE_URL');
  } else {
    Reflect.set(environment, 'PLAYER_PORTAL_API_BASE_URL', originalPlayerPortalBaseUrl);
  }

  if (originalVercelEnvironment === undefined) {
    Reflect.deleteProperty(environment, 'VERCEL_ENV');
  } else {
    Reflect.set(environment, 'VERCEL_ENV', originalVercelEnvironment);
  }
});

describe('readPlayerPortalApiBaseUrl', () => {
  it('uses the Railway staging Player API only for Vercel previews when no explicit base URL exists', () => {
    const environment = runtimeEnvironment();
    Reflect.deleteProperty(environment, 'PLAYER_PORTAL_API_BASE_URL');
    Reflect.set(environment, 'VERCEL_ENV', 'preview');

    expect(readPlayerPortalApiBaseUrl()).toBe(STAGING_PLAYER_API_URL);
  });

  it('stays fail-closed outside preview when no explicit base URL exists', () => {
    const environment = runtimeEnvironment();
    Reflect.deleteProperty(environment, 'PLAYER_PORTAL_API_BASE_URL');
    Reflect.set(environment, 'VERCEL_ENV', 'production');

    expect(readPlayerPortalApiBaseUrl()).toBeNull();

    Reflect.deleteProperty(environment, 'VERCEL_ENV');
    expect(readPlayerPortalApiBaseUrl()).toBeNull();
  });

  it('prefers an explicit configured base URL over the preview fallback', () => {
    const environment = runtimeEnvironment();
    Reflect.set(environment, 'VERCEL_ENV', 'preview');
    Reflect.set(environment, 'PLAYER_PORTAL_API_BASE_URL', '  https://player.example.test  ');

    expect(readPlayerPortalApiBaseUrl()).toBe('https://player.example.test');
  });
});
