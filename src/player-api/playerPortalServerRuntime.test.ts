import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readPlayerPortalApiBaseUrl } from './playerPortalServerRuntime';

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
const originalVercelEnv = runtimeEnvironment().VERCEL_ENV;

// These cases exercise the configured production endpoint. In Vercel Preview,
// the runtime intentionally refuses to inherit production; that fail-closed
// behavior is covered separately by the Premium staging boundary tests.
beforeEach(() => {
  Reflect.set(runtimeEnvironment(), 'VERCEL_ENV', 'production');
});

afterEach(() => {
  const environment = runtimeEnvironment();
  if (originalVercelEnv === undefined) {
    Reflect.deleteProperty(environment, 'VERCEL_ENV');
  } else {
    Reflect.set(environment, 'VERCEL_ENV', originalVercelEnv);
  }
  if (originalPlayerPortalBaseUrl === undefined) {
    Reflect.deleteProperty(environment, 'PLAYER_PORTAL_API_BASE_URL');
  } else {
    Reflect.set(environment, 'PLAYER_PORTAL_API_BASE_URL', originalPlayerPortalBaseUrl);
  }
});

describe('readPlayerPortalApiBaseUrl', () => {
  it('fails closed when no explicit Player Portal endpoint is configured', () => {
    const environment = runtimeEnvironment();
    Reflect.deleteProperty(environment, 'PLAYER_PORTAL_API_BASE_URL');

    expect(readPlayerPortalApiBaseUrl()).toBeNull();
  });

  it('uses the explicitly configured Player Portal endpoint', () => {
    const environment = runtimeEnvironment();
    Reflect.set(environment, 'PLAYER_PORTAL_API_BASE_URL', '  https://player.example.test  ');

    expect(readPlayerPortalApiBaseUrl()).toBe('https://player.example.test');
  });
});
