export interface DeliveryProduct {
  sku: string;
  title: string;
  maxQuantity: number;
  entitlementKey: string;
  grantModel: 'TIMED' | 'PERMANENT';
  durationSecondsPerUnit: number | null;
}

export interface ManualDeliveryEntry {
  id: string;
  requestId: string;
  entitlementKey: string;
  durationSeconds: number | null;
  actorPrincipalId: string;
  sku: string;
  quantity: number;
  reason: string;
  createdAt: string;
}

export type ManualDeliveryResult =
  | { status: 'applied'; replayed: boolean; requestId: string }
  | {
      status:
        | 'unavailable'
        | 'uncertain'
        | 'forbidden'
        | 'unauthenticated'
        | 'rejected'
        | 'product-unavailable'
        | 'conflict';
      error?: string;
    };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
async function resultOrError(response: Response): Promise<unknown> {
  if (
    response.status === 401 ||
    response.status === 403 ||
    response.status === 503 ||
    response.status === 404 ||
    response.status === 502
  )
    return null;
  if (!response.ok) throw new Error(`Requisição de entrega falhou (HTTP ${response.status}).`);
  return response.json() as Promise<unknown>;
}

export async function readManualDeliveryCatalog(
  fetcher: typeof fetch = fetch,
): Promise<DeliveryProduct[]> {
  const response = await fetcher('/api/hub/admin/premium/delivery/catalog', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  const body = await resultOrError(response);
  if (!record(body) || !Array.isArray(body.products))
    throw new Error('Catálogo de entregas indisponível.');
  if (
    !body.products.every(
      (p: unknown) =>
        record(p) &&
        typeof p.sku === 'string' &&
        typeof p.title === 'string' &&
        Number.isSafeInteger(p.maxQuantity) &&
        typeof p.entitlementKey === 'string' &&
        (p.grantModel === 'TIMED' || p.grantModel === 'PERMANENT') &&
        (p.durationSecondsPerUnit === null || Number.isSafeInteger(p.durationSecondsPerUnit)),
    )
  ) {
    throw new Error('Catálogo retornou dados inválidos.');
  }
  return body.products as DeliveryProduct[];
}

export async function readManualDeliveryHistory(
  playerId: string,
  fetcher: typeof fetch = fetch,
): Promise<ManualDeliveryEntry[]> {
  if (!UUID.test(playerId)) throw new Error('Jogador inválido.');
  const response = await fetcher(
    `/api/hub/admin/premium?playerId=${encodeURIComponent(playerId)}&resource=deliveries`,
    {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    },
  );
  const body = await resultOrError(response);
  if (!record(body) || !Array.isArray(body.deliveries))
    throw new Error('Histórico de entregas indisponível.');
  if (
    !body.deliveries.every(
      (x: unknown) =>
        record(x) &&
        UUID.test(String(x.id)) &&
        UUID.test(String(x.requestId)) &&
        UUID.test(String(x.actorPrincipalId)) &&
        typeof x.sku === 'string' &&
        typeof x.entitlementKey === 'string' &&
        Number.isSafeInteger(x.quantity) &&
        typeof x.reason === 'string' &&
        typeof x.createdAt === 'string',
    )
  )
    throw new Error('Histórico retornou dados inválidos.');
  return body.deliveries as ManualDeliveryEntry[];
}

export async function submitManualDelivery(
  payload: { requestId: string; playerId: string; sku: string; quantity: number; reason: string },
  fetcher: typeof fetch = fetch,
): Promise<ManualDeliveryResult> {
  if (
    !UUID.test(payload.requestId) ||
    !UUID.test(payload.playerId) ||
    !/^[A-Z0-9][A-Z0-9_.:-]{1,127}$/.test(payload.sku) ||
    !Number.isSafeInteger(payload.quantity) ||
    payload.quantity < 1 ||
    payload.quantity > 99 ||
    payload.reason.trim().length < 8 ||
    payload.reason.trim().length > 400
  ) {
    throw new Error('Confira os campos antes de entregar.');
  }
  const response = await fetcher('/api/hub/admin/premium/delivery', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, reason: payload.reason.trim() }),
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (response.status === 404) {
    // An existing route can reject an unpublished SKU with the same HTTP code
    // as a missing API route. Do not misreport either as a successful delivery.
    const body: unknown = await response.json().catch(() => null);
    return record(body) && body.error === 'PRODUCT_UNAVAILABLE'
      ? { status: 'product-unavailable' }
      : { status: 'unavailable' };
  }
// A gateway error cannot prove whether upstream applied the grant.
  // Preserve requestId so the operator can reconcile and retry idempotently.
  if (response.status === 502 || response.status === 503) return { status: 'uncertain' };
  if (response.status === 409) return { status: 'conflict' };
  if (!response.ok) return { status: 'rejected', error: `HTTP_${response.status}` };
  const body: unknown = await response.json();
  if (
    !record(body) ||
    body.applied !== true ||
    typeof body.replayed !== 'boolean' ||
    body.requestId !== payload.requestId ||
    !record(body.entitlement) ||
    body.entitlement.playerId !== payload.playerId
  ) {
    throw new Error('Resposta de entrega inválida: confira o histórico antes de repetir.');
  }
  return { status: 'applied', replayed: body.replayed, requestId: payload.requestId };
}
