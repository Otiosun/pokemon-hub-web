/**
 * The remote Vercel BFF can reach a PC-hosted Player Portal ONLY through an
 * HTTPS origin the owner already operates. This configuration creates no
 * tunnel, never starts the bot and is disabled by default.
 */
export function resolvePremiumLocalApiBaseUrl(config: {
  vercelEnv: string | null | undefined;
  enabled: string | null | undefined;
  approvedOrigin: string | null | undefined;
  apiBaseUrl: string | null | undefined;
}): string | null {
  if (
    config.vercelEnv !== 'production' ||
    config.enabled !== '1' ||
    !config.approvedOrigin ||
    !config.apiBaseUrl
  )
    return null;
  try {
    const api = new URL(config.apiBaseUrl);
    const approved = new URL(config.approvedOrigin);
    for (const url of [api, approved]) {
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        url.port ||
        !url.hostname.includes('.') ||
        url.hostname.endsWith('.local') ||
        url.hostname.endsWith('.internal') ||
        /^[0-9.]+$/.test(url.hostname)
      )
        return null;
    }
    if (api.origin !== approved.origin) return null;
    return api.origin;
  } catch {
    return null;
  }
}
