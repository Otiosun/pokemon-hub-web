import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readPlayerPortalApiBaseUrl,
  readPremiumManualApiBaseUrl,
  readPremiumStagingApiBaseUrl,
} from './playerPortalServerRuntime';

const production = 'https://live-player.example.org';
const staging = 'https://isolated-player.example.org';

afterEach(() => {
  vi.unstubAllEnvs();
});

function setPreviewWithAccidentalProductionLeak(): void {
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', production);
  vi.stubEnv('PREMIUM_LOCAL_ENABLED', '1');
  vi.stubEnv('PREMIUM_LOCAL_APPROVED_ORIGIN', production);
}

describe('Hub Preview must never reach the production Player Portal', () => {
  it('refuses the production URL for ordinary and Premium requests without staging config', () => {
    setPreviewWithAccidentalProductionLeak();
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', '');
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', '');

    expect(readPlayerPortalApiBaseUrl()).toBeNull();
    expect(readPremiumStagingApiBaseUrl()).toBeNull();
    expect(readPremiumManualApiBaseUrl()).toBeNull();
  });

  it('stays closed with a staging URL unless explicitly enabled and origin-approved', () => {
    setPreviewWithAccidentalProductionLeak();
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '0');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', staging);
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', staging);

    expect(readPlayerPortalApiBaseUrl()).toBeNull();
    expect(readPremiumManualApiBaseUrl()).toBeNull();

    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', production);

    expect(readPlayerPortalApiBaseUrl()).toBeNull();
    expect(readPremiumManualApiBaseUrl()).toBeNull();
  });

  it('routes both surfaces only to the separately approved staging HTTPS origin', () => {
    setPreviewWithAccidentalProductionLeak();
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', staging);
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', staging);

    expect(readPlayerPortalApiBaseUrl()).toBe(staging);
    expect(readPremiumStagingApiBaseUrl()).toBe(staging);
    expect(readPremiumManualApiBaseUrl()).toBe(staging);
    expect(readPlayerPortalApiBaseUrl()).not.toBe(production);
  });

  it('rejects using the production origin as its own approved staging target', () => {
    setPreviewWithAccidentalProductionLeak();
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', production);
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', production);

    expect(readPlayerPortalApiBaseUrl()).toBeNull();
    expect(readPremiumStagingApiBaseUrl()).toBeNull();
    expect(readPremiumManualApiBaseUrl()).toBeNull();
  });

  it('keeps ordinary production routing unchanged outside Preview', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', production);
    vi.stubEnv('PREMIUM_STAGING_ENABLED', '1');
    vi.stubEnv('PREMIUM_STAGING_API_BASE_URL', staging);
    vi.stubEnv('PREMIUM_STAGING_APPROVED_ORIGIN', staging);

    expect(readPlayerPortalApiBaseUrl()).toBe(production);
    expect(readPremiumStagingApiBaseUrl()).toBeNull();
  });
});
