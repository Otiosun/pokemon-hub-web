/**
 * Staging Premium traffic is a separate trust boundary. Never reuse the Hub's
 * normal production upstream for orders, payment decisions or entitlements.
 */
export interface PremiumStagingConfiguration {
  vercelEnv: string | null | undefined;
  enabled: string | null | undefined;
  apiBaseUrl: string | null | undefined;
  approvedOrigin: string | null | undefined;
  productionApiBaseUrl?: string | null | undefined;
}

function asHttpsOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) return null;
    if (!url.hostname.includes('.') || url.hostname === 'pokemon-api.otiosunbots.xyz') return null;
    return url;
  } catch {
    return null;
  }
}

/** Disabled by default, including every production deployment. */
export function resolvePremiumStagingApiBaseUrl(config: PremiumStagingConfiguration): string | null {
  if (config.vercelEnv !== 'preview' || config.enabled !== '1' ||
      !config.apiBaseUrl || !config.approvedOrigin) return null;

  const api = asHttpsOrigin(config.apiBaseUrl);
  const approved = asHttpsOrigin(config.approvedOrigin);
  if (!api || !approved || api.origin !== approved.origin) return null;

  if (config.productionApiBaseUrl) {
    try {
      if (new URL(config.productionApiBaseUrl).origin === api.origin) return null;
    } catch {
      // An invalid production URL must not authorize staging.
      return null;
    }
  }
  return api.origin;
}
