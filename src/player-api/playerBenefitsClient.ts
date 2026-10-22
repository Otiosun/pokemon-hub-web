/** Personal benefit read model. Never derives entitlements from orders or notifications. */
export interface PlayerBenefit {
  playerId: string;
  entitlementKey: string;
  grantModel: 'PERMANENT' | 'TIMED';
  administrativeStatus: 'ACTIVE' | 'REVOKED';
  startsAt: string;
  expiresAt: string | null;
  revision: string;
  currentlyActive: boolean;
}

export type PlayerBenefitsResponse =
  | { status: 'authenticated'; entitlements: PlayerBenefit[] }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPlayerBenefit(value: unknown): value is PlayerBenefit {
  if (!isRecord(value)) return false;
  return typeof value.playerId === 'string' && UUID.test(value.playerId) &&
    typeof value.entitlementKey === 'string' && /^[A-Z0-9][A-Z0-9_.:-]{1,127}$/.test(value.entitlementKey) &&
    (value.grantModel === 'PERMANENT' || value.grantModel === 'TIMED') &&
    (value.administrativeStatus === 'ACTIVE' || value.administrativeStatus === 'REVOKED') &&
    typeof value.startsAt === 'string' && Number.isFinite(Date.parse(value.startsAt)) &&
    (value.expiresAt === null || (typeof value.expiresAt === 'string' && Number.isFinite(Date.parse(value.expiresAt)))) &&
    (value.grantModel === 'TIMED' ? value.expiresAt !== null : value.expiresAt === null) &&
    typeof value.revision === 'string' && /^\d+$/.test(value.revision) &&
    typeof value.currentlyActive === 'boolean';
}

/** Only the authenticated player's own records; never accepts a playerId argument. */
export async function getPlayerBenefits(
  fetcher: typeof fetch = fetch,
): Promise<PlayerBenefitsResponse> {
  const response = await fetcher('/api/hub/player/benefits', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) return { status: 'unavailable' };

  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.entitlements) ||
      !body.entitlements.every(isPlayerBenefit)) return { status: 'unavailable' };
  // One authenticated identity per response; never display mixed-account data.
  if (new Set((body.entitlements as PlayerBenefit[]).map((row) => row.playerId)).size > 1) {
    return { status: 'unavailable' };
  }
  return { status: 'authenticated', entitlements: body.entitlements };
}

export type BenefitDisplayState = 'active' | 'expired' | 'revoked';

/** Effective timestamp is checked locally to prevent an expired boost being painted active. */
export function benefitDisplayState(benefit: PlayerBenefit, at = Date.now()): BenefitDisplayState {
  if (benefit.administrativeStatus === 'REVOKED') return 'revoked';
  if (benefit.grantModel === 'TIMED' && benefit.expiresAt !== null &&
      Date.parse(benefit.expiresAt) <= at) return 'expired';
  return benefit.currentlyActive ? 'active' : 'expired';
}

export function benefitTitle(key: string) {
  const known: Record<string, string> = {
    XP_2X: 'Experiência em dobro',
    CAPTURE_LUCK_2X: 'Bênção da Sorte',
  };
  return known[key] ?? key.replaceAll('_', ' ').replaceAll('-', ' ');
}
