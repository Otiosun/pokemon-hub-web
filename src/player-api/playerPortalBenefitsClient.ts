/** The personal benefits ledger is never inferred from a checkout or an admin page. */
export interface PlayerBenefit {
  playerId: string;
  entitlementKey: string;
  grantModel: 'TIMED' | 'PERMANENT';
  administrativeStatus: 'ACTIVE' | 'REVOKED';
  startsAt: string;
  expiresAt: string | null;
  currentlyActive: boolean;
}

export type PlayerBenefitsResult =
  | { status: 'ready'; entitlements: readonly PlayerBenefit[] }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Z0-9][A-Z0-9_.:-]{1,127}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
}
export function isPlayerBenefit(value: unknown): value is PlayerBenefit {
  if (!isRecord(value)) return false;
  return (
    typeof value.playerId === 'string' && UUID.test(value.playerId) &&
    typeof value.entitlementKey === 'string' && KEY.test(value.entitlementKey) &&
    (value.grantModel === 'TIMED' || value.grantModel === 'PERMANENT') &&
    (value.administrativeStatus === 'ACTIVE' || value.administrativeStatus === 'REVOKED') &&
    validDate(value.startsAt) &&
    (value.expiresAt === null || validDate(value.expiresAt)) &&
    typeof value.currentlyActive === 'boolean' &&
    (value.grantModel !== 'PERMANENT' || value.expiresAt === null)
  );
}

/** True only if the entitlement is active at the actual time of rendering. */
export function benefitIsActive(item: PlayerBenefit, now = Date.now()): boolean {
  return item.currentlyActive &&
    item.administrativeStatus === 'ACTIVE' &&
    Date.parse(item.startsAt) <= now &&
    (item.expiresAt === null || Date.parse(item.expiresAt) > now);
}

export async function readPlayerBenefits(
  fetcher: typeof fetch = fetch,
): Promise<PlayerBenefitsResult> {
  const response = await fetcher('/api/hub/player/benefits', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) return { status: 'unavailable' };
  const body: unknown = await response.json().catch(() => null);
  if (!isRecord(body) || !Array.isArray(body.entitlements) ||
    body.entitlements.length > 150 ||
    !body.entitlements.every(isPlayerBenefit)) return { status: 'unavailable' };
  return { status: 'ready', entitlements: body.entitlements };
}
