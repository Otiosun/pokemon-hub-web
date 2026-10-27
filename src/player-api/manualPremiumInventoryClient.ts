export interface DeliveryInventoryItem {
  itemId: string;
  displayName: string;
  slug: string;
}

export type InventoryDeliveryOutcome =
  | { kind: 'APPLIED'; replayed: boolean; operationId: string }
  | { kind: 'ERROR'; code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'UNAVAILABLE' | 'REJECTED' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function readDeliveryInventoryCatalog(
  fetcher: typeof fetch = fetch,
): Promise<DeliveryInventoryItem[]> {
  const response = await fetcher('/api/hub/admin/premium/delivery/items', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Catálogo de itens não disponível no staging.');
  const payload: unknown = await response.json();
  if (
    !object(payload) ||
    !Array.isArray(payload.items) ||
    !payload.items.every(
      (item: unknown) =>
        object(item) &&
        UUID.test(String(item.itemId)) &&
        typeof item.slug === 'string' &&
        typeof item.displayName === 'string',
    )
  )
    throw new Error('Catálogo de itens inválido.');
  return payload.items as DeliveryInventoryItem[];
}

export async function deliverPublishedInventoryItem(
  input: {
    requestId: string;
    playerId: string;
    itemId: string;
    quantity: number;
    reason: string;
  },
  fetcher: typeof fetch = fetch,
): Promise<InventoryDeliveryOutcome> {
  if (
    ![input.requestId, input.playerId, input.itemId].every((id) => UUID.test(id)) ||
    !Number.isSafeInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 1000 ||
    input.reason.trim().length < 8 ||
    input.reason.trim().length > 400
  ) {
    throw new Error('Confira o treinador, o item, a quantidade e a justificativa.');
  }
  const response = await fetcher('/api/hub/admin/premium/delivery/items', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ ...input, reason: input.reason.trim() }),
  });
  if (response.status === 401) return { kind: 'ERROR', code: 'UNAUTHORIZED' };
  if (response.status === 403) return { kind: 'ERROR', code: 'FORBIDDEN' };
  if ([404, 502, 503].includes(response.status)) return { kind: 'ERROR', code: 'UNAVAILABLE' };
  if (!response.ok) return { kind: 'ERROR', code: 'REJECTED' };
  const payload: unknown = await response.json();
  if (
    !object(payload) ||
    payload.applied !== true ||
    typeof payload.replayed !== 'boolean' ||
    payload.playerId !== input.playerId ||
    payload.itemId !== input.itemId ||
    payload.quantity !== input.quantity ||
    payload.requestId !== input.requestId ||
    !UUID.test(String(payload.operationId))
  ) {
    throw new Error(
      'Resposta não confirmada. Verifique o histórico de operações antes de tentar novamente.',
    );
  }
  return { kind: 'APPLIED', replayed: payload.replayed, operationId: String(payload.operationId) };
}
