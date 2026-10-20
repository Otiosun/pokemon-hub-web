import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePremiumLocalApiBaseUrl } from './premiumLocalBoundary';
import { readPremiumManualApiBaseUrl } from './playerPortalServerRuntime';

const origin = 'https://pokemon-api.otiosunbots.xyz';
const local = { vercelEnv: 'production', enabled: '1', apiBaseUrl: origin, approvedOrigin: origin };

afterEach(() => { vi.unstubAllEnvs(); });

describe('Premium local operator origin, disabled by default', () => {
  it('requires explicit production-only approval matching the existing HTTPS Hub API', () => {
    expect(resolvePremiumLocalApiBaseUrl(local)).toBe(origin);
    expect(resolvePremiumLocalApiBaseUrl({ ...local, enabled: undefined })).toBeNull();
    expect(resolvePremiumLocalApiBaseUrl({ ...local, vercelEnv: 'preview' })).toBeNull();
    expect(resolvePremiumLocalApiBaseUrl({ ...local, approvedOrigin: 'https://other.example.org' })).toBeNull();
    expect(resolvePremiumLocalApiBaseUrl({ ...local, apiBaseUrl: undefined })).toBeNull();
  });
  it('refuses arbitrary ports, local addresses, spoofed origins and protocol downgrades', () => {
    for (const host of [
      'http://pokemon-api.otiosunbots.xyz',
      'https://127.0.0.1',
      'https://localhost',
      'https://pokemon-api.otiosunbots.xyz:443',
      'https://pokemon-api.otiosunbots.xyz/premium',
      'https://pokemon-api.otiosunbots.xyz/?x=1',
      'https://owner:password@pokemon-api.otiosunbots.xyz',
      'https://pokemon-api.otiosunbots.xyz.evil.invalid',
      'not-a-url',
    ]) {
      expect(resolvePremiumLocalApiBaseUrl({ ...local, apiBaseUrl: host })).toBeNull();
    }
  });
  it('selects local mode only under explicit production Vercel settings, never preview', () => {
    vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', origin);
    vi.stubEnv('PREMIUM_LOCAL_ENABLED', '1');
    vi.stubEnv('PREMIUM_LOCAL_APPROVED_ORIGIN', origin);
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(readPremiumManualApiBaseUrl()).toBeNull();
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(readPremiumManualApiBaseUrl()).toBe(origin);
    vi.stubEnv('PREMIUM_LOCAL_APPROVED_ORIGIN', 'https://other.example.org');
    expect(readPremiumManualApiBaseUrl()).toBeNull();
    vi.stubEnv('PREMIUM_LOCAL_APPROVED_ORIGIN', origin);
    vi.stubEnv('PREMIUM_LOCAL_ENABLED', '0');
    expect(readPremiumManualApiBaseUrl()).toBeNull();
  });
});
