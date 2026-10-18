export type PremiumReadResource = 'orders' | 'entitlements';
export type PremiumOrderStatus = 'PENDING' | 'PAID' | 'APPLIED' | 'CANCELLED';

export interface PremiumOrderLine {
  id: string;
  sku: string;
  title: string;
  quantity: number;
  lineTotalCents: number;
  fulfilled: boolean;
}

export interface PremiumOrder {
  id: string;
  humanId: string;
  playerId: string;
  status: PremiumOrderStatus;
  revision: string;
  currency: string;
  totalCents: number;
  createdAt: string;
  paidAt: string | null;
  appliedAt: string | null;
  items: PremiumOrderLine[];
}

export interface PremiumEntitlement {
  playerId: string;
  entitlementKey: string;
  grantModel: 'TIMED' | 'PERMANENT';
  administrativeStatus: 'ACTIVE' | 'REVOKED';
  currentlyActive: boolean;
  startsAt: string;
  expiresAt: string | null;
}

export type AdminPremiumReadResult =
  | { status: 'ok'; orders: PremiumOrder[]; entitlements?: never }
  | { status: 'ok'; entitlements: PremiumEntitlement[]; orders?: never }
  | { status: 'unavailable' | 'forbidden' | 'unauthenticated' };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isOrder(value: unknown): value is PremiumOrder {
  if (!object(value) || !Array.isArray(value.items)) return false;
  return (
    typeof value.id === 'string' &&
    UUID_PATTERN.test(value.id) &&
    typeof value.humanId === 'string' &&
    typeof value.playerId === 'string' &&
    UUID_PATTERN.test(value.playerId) &&
    ['PENDING', 'PAID', 'APPLIED', 'CANCELLED'].includes(String(value.status)) &&
    typeof value.revision === 'string' && /^\\d{1,20}$/.test(value.revision) &&
    typeof value.currency === 'string' &&
    Number.isSafeInteger(value.totalCents) &&
    typeof value.createdAt === 'string' &&
    nullableString(value.paidAt) &&
    nullableString(value.appliedAt) &&
    value.items.every((item: unknown) =>
      object(item) &&
      typeof item.id === 'string' &&
      typeof item.sku === 'string' &&
      typeof item.title === 'string' &&
      Number.isSafeInteger(item.quantity) &&
      Number.isSafeInteger(item.lineTotalCents) &&
      typeof item.fulfilled === 'boolean'
    )
  );
}

function isEntitlement(value: unknown): value is PremiumEntitlement {
  return object(value) &&
    typeof value.playerId === 'string' &&
    UUID_PATTERN.test(value.playerId) &&
    typeof value.entitlementKey === 'string' &&
    (value.grantModel === 'PERMANENT' || value.grantModel === 'TIMED') &&
    (value.administrativeStatus === 'ACTIVE' || value.administrativeStatus === 'REVOKED') &&
    typeof value.currentlyActive === 'boolean' &&
    typeof value.startsAt === 'string' &&
    nullableString(value.expiresAt);
}

export async function getAdminPremiumRead(
  playerId: string,
  resource: PremiumReadResource,
  fetcher: typeof fetch = fetch,
): Promise<AdminPremiumReadResult> {
  if (!UUID_PATTERN.test(playerId)) throw new Error('Identificador de jogador inválido.');

  const search = new URLSearchParams({ playerId, resource });
  const response = await fetcher(`/api/hub/admin/premium?${search}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  // The legacy backend has no premium read routes; do not show invented data.
  if (response.status === 404 || response.status === 503) return { status: 'unavailable' };
  if (!response.ok) throw new Error('Consulta Premium indisponível no momento.');

  const body = (await response.json()) as unknown;
  if (!object(body)) throw new Error('Resposta Premium inválida.');

  if (resource === 'orders') {
    if (!Array.isArray(body.orders) || !body.orders.every(isOrder)) {
      throw new Error('Lista de pedidos recebida em formato inválido.');
    }
    return { status: 'ok', orders: body.orders };
  }
  if (!Array.isArray(body.entitlements) || !body.entitlements.every(isEntitlement)) {
    throw new Error('Lista de benefícios recebida em formato inválido.');
  }
  return { status: 'ok', entitlements: body.entitlements };
}
