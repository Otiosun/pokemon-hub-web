/** Commercial MASTER fulfillment; unlike item grants the caller never selects an item ID. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATH = '/api/hub/admin/premium/delivery/packs/master';
const jsonHeaders = { accept: 'application/json' };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export interface MasterBallCatalog {
  sku: 'MASTER';
  quantityPerUnit: 1;
  maxQuantity: 20;
  available: boolean;
  item: { itemId: string; displayName: string } | null;
}

export type MasterBallDeliveryOutcome =
  | { kind: 'APPLIED'; replayed: boolean; operationId: string }
  | {
      kind: 'ERROR';
      code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'UNAVAILABLE' | 'NOT_PUBLISHED' | 'REJECTED';
    };

export async function readMasterBallCatalog(
  fetcher: typeof fetch = fetch,
): Promise<MasterBallCatalog> {
  const response = await fetcher(PATH, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: jsonHeaders,
  });
  if (!response.ok) throw new Error('Executor MASTER indisponível no staging.');
  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    body.sku !== 'MASTER' ||
    body.quantityPerUnit !== 1 ||
    body.maxQuantity !== 20 ||
    typeof body.available !== 'boolean' ||
    (body.available
      ? !isRecord(body.item) ||
        !UUID.test(String(body.item.itemId)) ||
        typeof body.item.displayName !== 'string' ||
        !body.item.displayName.trim()
      : body.item !== null)
  ) {
    throw new Error('O catálogo MASTER retornou uma resposta inválida.');
  }
  return body as unknown as MasterBallCatalog;
}

export async function deliverMasterBallPack(
  input: { requestId: string; playerId: string; quantity: number; reason: string },
  fetcher: typeof fetch = fetch,
): Promise<MasterBallDeliveryOutcome> {
  if (
    !UUID.test(input.requestId) ||
    !UUID.test(input.playerId) ||
    !Number.isSafeInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 20 ||
    input.reason.trim().length < 8 ||
    input.reason.trim().length > 400
  ) {
    throw new Error('Confira o treinador, a quantidade e a justificativa.');
  }
  const response = await fetcher(PATH, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { ...jsonHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      requestId: input.requestId,
      playerId: input.playerId,
      sku: 'MASTER',
      quantity: input.quantity,
      reason: input.reason.trim(),
    }),
  });
  if (response.status === 401) return { kind: 'ERROR', code: 'UNAUTHORIZED' };
  if (response.status === 403) return { kind: 'ERROR', code: 'FORBIDDEN' };
  if ([404, 502, 503].includes(response.status)) return { kind: 'ERROR', code: 'UNAVAILABLE' };
  if (response.status === 409) {
    const data: unknown = await response.json().catch(() => null);
    return {
      kind: 'ERROR',
      code:
        isRecord(data) && data.error === 'MASTER_BALL_NOT_PUBLISHED' ? 'NOT_PUBLISHED' : 'REJECTED',
    };
  }
  if (!response.ok) return { kind: 'ERROR', code: 'REJECTED' };
  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    body.applied !== true ||
    typeof body.replayed !== 'boolean' ||
    body.sku !== 'MASTER' ||
    body.playerId !== input.playerId ||
    body.requestId !== input.requestId ||
    body.quantity !== input.quantity ||
    !UUID.test(String(body.itemId)) ||
    !UUID.test(String(body.operationId))
  ) {
    throw new Error('Resultado da entrega incerto; consulte operações antes de tentar novamente.');
  }
  return { kind: 'APPLIED', replayed: body.replayed, operationId: String(body.operationId) };
}
