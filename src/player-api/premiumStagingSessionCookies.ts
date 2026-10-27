/** Keep test credentials out of every production Hub request, and vice versa. */
export const HUB_COOKIE = '__Host-pokemon_hub_session';
export const PREMIUM_STAGE_COOKIE = '__Host-pokemon_hub_premium_stage_session';

export type SessionScope = 'normal' | 'premium-stage' | 'none';
const SESSION_TOKEN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  const values = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(name + '='));
  if (values.length !== 1) return null; // Fail closed on duplicates, never guess.
  const value = values[0]!.slice(name.length + 1);
  return value && value.length <= 4096 && !/[\r\n;,\s]/.test(value) ? value : null;
}

export function scopedSessionCookie(header: string | null, scope: SessionScope): string | null {
  if (scope === 'none') return null;
  const value = cookieValue(header, scope === 'normal' ? HUB_COOKIE : PREMIUM_STAGE_COOKIE);
  if (!value) return null;
  // The staging token must always come from a signed staging backend exchange.
  // Normal sessions may have fixtures in tests; the remote backend verifies both.
  if (scope === 'premium-stage' && !SESSION_TOKEN.test(value)) return null;
  return `${HUB_COOKIE}=${value}`;
}

/** Strict exchange: never trust upstream Domain/Path/Cookie attributes. */
export function stageExchangeCookie(upstreamCookie: string | null): string | null {
  if (!upstreamCookie || /[\r\n]/.test(upstreamCookie)) return null;
  const parts = upstreamCookie.split(';').map((part) => part.trim());
  if (parts.length < 5 || !parts[0]?.startsWith(HUB_COOKIE + '=')) return null;
  const token = parts[0].slice(HUB_COOKIE.length + 1);
  if (token.length > 4096 || !SESSION_TOKEN.test(token)) return null;
  const attrs = new Map<string, string>();
  for (const part of parts.slice(1)) {
    const [key, ...value] = part.split('=');
    if (!key || attrs.has(key.toLowerCase())) return null;
    attrs.set(key.toLowerCase(), value.join('='));
  }
  if (
    !attrs.has('secure') ||
    !attrs.has('httponly') ||
    attrs.get('path') !== '/' ||
    attrs.has('domain')
  )
    return null;
  const maxAge = Number(attrs.get('max-age'));
  if (!Number.isSafeInteger(maxAge) || maxAge <= 0 || maxAge > 43200) return null;
  if (!['lax', 'strict'].includes(attrs.get('samesite')?.toLowerCase() ?? '')) return null;
  return `${PREMIUM_STAGE_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearPremiumStageCookie(): string {
  return `${PREMIUM_STAGE_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`;
}
