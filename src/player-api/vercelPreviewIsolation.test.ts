import rawVercelConfig from '../../vercel.json';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readPlayerPortalApiBaseUrl,
  readPremiumManualApiBaseUrl,
  readPremiumStagingApiBaseUrl,
} from './playerPortalServerRuntime';

const config = rawVercelConfig as unknown as {
  env?: Record<string, string>;
  build?: { env?: Record<string, string> };
};

afterEach(() => vi.unstubAllEnvs());

describe('Vercel Preview must not inherit the live Pokémon API', () => {
  it('has no serverless-wide or build-wide API upstream hardcoded in vercel.json', () => {
    expect(config.env?.PLAYER_PORTAL_API_BASE_URL).toBeUndefined();
    expect(config.build?.env?.PLAYER_PORTAL_API_BASE_URL).toBeUndefined();
    expect(JSON.stringify(config)).not.toContain('pokemon-api.otiosunbots.xyz');
  });

  it('denies every normal Preview proxy even when the live upstream was accidentally configured', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', '');
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', '');
    expect(readPlayerPortalApiBaseUrl()).toBeNull();
    expect(readPremiumStagingApiBaseUrl()).toBeNull();
  });

  it('permits all Preview routes only on the same explicitly approved staging origin', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', 'https://isolated-staging.example.org');
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', 'https://isolated-staging.example.org');
    expect(readPlayerPortalApiBaseUrl()).toBe('https://isolated-staging.example.org');
    expect(readPremiumStagingApiBaseUrl()).toBe('https://isolated-staging.example.org');
    expect(readPremiumManualApiBaseUrl()).toBe('https://isolated-staging.example.org');
  });

  it('keeps the existing player-portal upstream exclusively for Production', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '');
    expect(readPlayerPortalApiBaseUrl()).toBe('https://pokemon-api.otiosunbots.xyz');
  });

  it('denies Preview Premium unless an independent backend is explicitly configured', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', '');
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', '');
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', '');
    expect(readPlayerPortalApiBaseUrl()).toBeNull();
    expect(readPremiumStagingApiBaseUrl()).toBeNull();
    expect(readPremiumManualApiBaseUrl()).toBeNull();
  });

  it('rejects a Preview Premium backend pointing at the live origin, even when flags are enabled', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', 'https://pokemon-api.otiosunbots.xyz');
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', 'https://pokemon-api.otiosunbots.xyz');
    expect(readPlayerPortalApiBaseUrl()).toBeNull();
    expect(readPremiumStagingApiBaseUrl()).toBeNull();
    expect(readPremiumManualApiBaseUrl()).toBeNull();
  });

  it('never enables Preview Premium in a production deployment', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', 'https://isolated-staging.example.org');
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', 'https://isolated-staging.example.org');
    vi.stubEnv('PREMIUM_LOCAL_ENABLED', '0');
    expect(readPremiumStagingApiBaseUrl()).toBeNull();
    expect(readPremiumManualApiBaseUrl()).toBeNull();
  });
});
