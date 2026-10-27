import { describe, expect, it } from 'vitest';
import { resolvePremiumStagingApiBaseUrl } from './premiumStagingBoundary';

const base = {
  vercelEnv: 'preview',
  enabled: '1',
  apiBaseUrl: 'https://pokemon-premium-staging.example.org',
  approvedOrigin: 'https://pokemon-premium-staging.example.org',
  productionApiBaseUrl: 'https://pokemon-api.otiosunbots.xyz',
};

describe('Premium staging trust boundary', () => {
  it('requires an explicitly enabled preview with a distinct approved HTTPS origin', () => {
    expect(resolvePremiumStagingApiBaseUrl(base)).toBe(base.apiBaseUrl);
    expect(resolvePremiumStagingApiBaseUrl({ ...base, enabled: undefined })).toBeNull();
    expect(resolvePremiumStagingApiBaseUrl({ ...base, vercelEnv: 'production' })).toBeNull();
    expect(resolvePremiumStagingApiBaseUrl({ ...base, vercelEnv: undefined })).toBeNull();
    expect(resolvePremiumStagingApiBaseUrl({ ...base, approvedOrigin: undefined })).toBeNull();
    expect(
      resolvePremiumStagingApiBaseUrl({ ...base, approvedOrigin: 'https://another.example.org' }),
    ).toBeNull();
  });

  it('rejects production, malformed, insecure or credential-bearing upstreams', () => {
    for (const apiBaseUrl of [
      'https://pokemon-api.otiosunbots.xyz',
      'http://pokemon-premium-staging.example.org',
      'https://user:pass@pokemon-premium-staging.example.org',
      'https://pokemon-premium-staging.example.org/api',
      'https://pokemon-premium-staging.example.org/?debug=1',
      'not-a-url',
    ]) {
      expect(
        resolvePremiumStagingApiBaseUrl({ ...base, apiBaseUrl, approvedOrigin: apiBaseUrl }),
      ).toBeNull();
    }
    expect(
      resolvePremiumStagingApiBaseUrl({
        ...base,
        productionApiBaseUrl: base.apiBaseUrl,
      }),
    ).toBeNull();
    expect(
      resolvePremiumStagingApiBaseUrl({
        ...base,
        productionApiBaseUrl: 'not-a-url',
      }),
    ).toBeNull();
  });
});
