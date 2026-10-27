/** Isolated staging-only authentication. Never read the normal Hub session. */
export type PremiumStageRole = 'owner' | 'delivery' | 'player';
export type PremiumStageSession =
  | { status: 'ready'; label: string; owner?: boolean; canSearchPlayers?: boolean }
  | { status: 'unauthenticated' | 'unavailable' | 'forbidden' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readPremiumStageSession(
  role: PremiumStageRole,
  fetcher: typeof fetch = fetch,
): Promise<PremiumStageSession> {
  const endpoint =
    role === 'owner' ? '/api/hub/admin/premium-auth/self' : '/api/hub/admin/premium-auth/player';
  const res = await fetcher(endpoint, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (res.status === 401) return { status: 'unauthenticated' };
  if ([404, 502, 503].includes(res.status)) return { status: 'unavailable' };
  if (res.status === 403) return { status: 'forbidden' };
  if (!res.ok) throw new Error('Não foi possível conferir a sessão de testes.');
  const body: unknown = await res.json();
  if (!record(body)) throw new Error('Sessão de testes retornada em formato inválido.');
  if (role === 'owner' || role === 'delivery') {
    if (
      !record(body.admin) ||
      !UUID.test(String(body.admin.principalId)) ||
      typeof body.admin.owner !== 'boolean' ||
      !Array.isArray(body.admin.capabilities) ||
      !body.admin.capabilities.every((capability: unknown) => typeof capability === 'string') ||
      !body.admin.capabilities.includes('central.view')
    )
      return { status: 'forbidden' };
    // The delivery role permits only an explicitly delegated grant capability.
    // The backend independently authorizes every subsequent Premium route.
    if (
      !body.admin.owner &&
      (role === 'owner' || !body.admin.capabilities.includes('premium.delivery.grant'))
    )
      return { status: 'forbidden' };
    return {
      status: 'ready',
      label: body.admin.owner ? 'PROPRIETÁRIO DE STAGING' : 'ENTREGAS AUTORIZADAS · STAGING',
      owner: body.admin.owner,
      canSearchPlayers: body.admin.owner || body.admin.capabilities.includes('player.read'),
    };
  }
  if (!record(body.profile) || !UUID.test(String(body.profile.playerId))) {
    throw new Error('Perfil de teste retornado em formato inválido.');
  }
  return { status: 'ready', label: 'TREINADOR DE STAGING' };
}

/**
 * Accept a freshly issued /hub link from the same official site, without
 * navigating to it (navigation would redeem the one-time ticket).
 * Never log or persist the raw URL; only its ticket reaches the exchange API.
 */
export function premiumTicketFromInput(input: string, siteOrigin: string): string | null {
  const value = input.trim();
  const valid = /^[A-Za-z0-9_-]{43}$/;
  if (valid.test(value)) return value;
  if (value.length > 2048 || /[\r\n]/.test(value)) return null;
  try {
    const link = new URL(value);
    const site = new URL(siteOrigin);
    if (
      link.protocol !== 'https:' ||
      site.protocol !== 'https:' ||
      link.origin !== site.origin ||
      link.username ||
      link.password
    )
      return null;
    const ticketValues = new URLSearchParams(link.hash.slice(1)).getAll('hub_ticket');
    return ticketValues.length === 1 && valid.test(ticketValues[0]!) ? ticketValues[0]! : null;
  } catch {
    return null;
  }
}

export async function exchangePremiumStageTicket(
  ticket: string,
  fetcher: typeof fetch = fetch,
): Promise<'ok' | 'invalid' | 'unavailable'> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) return 'invalid';
  const res = await fetcher('/api/hub/admin/premium-auth/exchange', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ ticket }),
  });
  if ([404, 502, 503].includes(res.status)) return 'unavailable';
  if (!res.ok) return 'invalid';
  // The HTTP-only session was set by the server; never expose it to JS.
  return 'ok';
}

export async function signOutPremiumStage(fetcher: typeof fetch = fetch): Promise<void> {
  const res = await fetcher('/api/hub/admin/premium-auth/logout', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Não foi possível encerrar a sessão de staging.');
}
