/** Read-only, session-bound view. Never infer ownership from storefront products. */
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
export type OwnBenefitsResult =
  | { status: 'authenticated'; benefits: PlayerBenefit[] }
  | { status: 'unauthenticated' | 'unavailable' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) &&
    /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function isBenefit(value: unknown): value is PlayerBenefit {
  return isRecord(value) &&
    typeof value.playerId === 'string' &&
    /^[a-f0-9-]{36}$/i.test(value.playerId) &&
    typeof value.entitlementKey === 'string' &&
    /^[A-Z0-9][A-Z0-9_.:-]{1,127}$/.test(value.entitlementKey) &&
    (value.grantModel === 'PERMANENT' || value.grantModel === 'TIMED') &&
    (value.administrativeStatus === 'ACTIVE' || value.administrativeStatus === 'REVOKED') &&
    isIsoDate(value.startsAt) &&
    (value.expiresAt === null || isIsoDate(value.expiresAt)) &&
    typeof value.revision === 'string' &&
    /^\d+$/.test(value.revision) &&
    typeof value.currentlyActive === 'boolean';
}

export async function getOwnBenefits(fetcher: typeof fetch = fetch): Promise<OwnBenefitsResult> {
  let response: Response;
  try {
    response = await fetcher('/api/hub/player/benefits', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
  } catch {
    return { status: 'unavailable' };
  }
  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) return { status: 'unavailable' };
  try {
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.entitlements) ||
      !payload.entitlements.every(isBenefit)) {
      return { status: 'unavailable' };
    }
    return { status: 'authenticated', benefits: payload.entitlements };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Server-provided active status is authoritative; the browser can only downgrade stale expiry. */
export function benefitDisplayState(benefit: PlayerBenefit, now = Date.now()):
  'active' | 'expired' | 'revoked' {
  if (benefit.administrativeStatus === 'REVOKED') return 'revoked';
  if (!benefit.currentlyActive) return 'expired';
  if (benefit.expiresAt !== null && Date.parse(benefit.expiresAt) <= now) return 'expired';
  return 'active';
}

export function benefitPresentation(key: string): { name: string; description: string; kind: 'xp' | 'luck' | 'other' } {
  switch (key) {
    case 'XP_2X':
      return { name: 'Experiência em dobro', description: 'Multiplicador de experiência em atividades elegíveis.', kind: 'xp' };
    case 'CAPTURE_LUCK_2X':
      return { name: 'Bênção da Sorte', description: 'Bônus de captura em encontros elegíveis.', kind: 'luck' };
    default:
      return { name: 'Benefício registrado', description: 'Vantagem vinculada oficialmente à sua conta.', kind: 'other' };
  }
}
