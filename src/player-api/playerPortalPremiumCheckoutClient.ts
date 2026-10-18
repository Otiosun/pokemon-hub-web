export interface PendingPremiumOrderView {
  id: string;
  humanId: string;
  playerId: string;
  status: 'PENDING';
  currency: string;
  totalCents: number;
}

export type PendingPremiumOrderResult =
  | { status: 'created'; order: PendingPremiumOrderView; replayed: boolean }
  | { status: 'unauthenticated' | 'unavailable' }
  | { status: 'rejected'; code: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_KEY = 'pokemon-beyond:checkout-2xp-intent:v1';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function checkoutIntentId(quantity: number, storage: Pick<Storage, 'getItem' | 'setItem'>, newId: () => string): string {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 52) throw new Error('Quantidade inválida.');
  const fingerprint = `2XP:${quantity}`;
  try {
    const previous = storage.getItem(STORAGE_KEY);
    if (previous) {
      const parsed: unknown = JSON.parse(previous);
      if (object(parsed) && parsed.fingerprint === fingerprint && typeof parsed.requestId === 'string' && UUID.test(parsed.requestId)) {
        return parsed.requestId;
      }
    }
  } catch {
    // Browsers may deny storage: the in-memory request still works.
  }

  const requestId = newId();
  if (!UUID.test(requestId)) throw new Error('Falha ao criar identificador de pedido.');
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ fingerprint, requestId })); } catch { /* optional */ }
  return requestId;
}

export async function createPending2XpOrder(
  quantity: number,
  requestId: string,
  fetcher: typeof fetch = fetch,
): Promise<PendingPremiumOrderResult> {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 52 || !UUID.test(requestId)) {
    throw new Error('Dados do pedido inválidos.');
  }

  const response = await fetcher('/api/hub/player/premium/orders', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ requestId, items: [{ sku: '2XP', quantity }] }),
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 503 || response.status === 404 || response.status === 502) {
    return { status: 'unavailable' };
  }
  const body = await response.json().catch((): unknown => null) as unknown;
  if (!response.ok) {
    const code = object(body) && typeof body.error === 'string' ? body.error : `HTTP_${response.status}`;
    return { status: 'rejected', code };
  }
  if (
    !object(body) ||
    !object(body.order) ||
    typeof body.order.id !== 'string' ||
    !UUID.test(body.order.id) ||
    typeof body.order.humanId !== 'string' ||
    !/^PB-[0-9]{8,20}$/.test(body.order.humanId) ||
    typeof body.order.playerId !== 'string' ||
    !UUID.test(body.order.playerId) ||
    body.order.status !== 'PENDING' ||
    typeof body.order.currency !== 'string' ||
    typeof body.order.totalCents !== 'number' ||
    !Number.isSafeInteger(body.order.totalCents) ||
    body.order.totalCents < 1 ||
    typeof body.replayed !== 'boolean' ||
    body.paymentStatus !== 'PENDING'
  ) {
    throw new Error('O servidor respondeu com um pedido inválido.');
  }
  return {
    status: 'created',
    replayed: body.replayed,
    order: {
      id: body.order.id,
      humanId: body.order.humanId,
      playerId: body.order.playerId,
      status: 'PENDING',
      currency: body.order.currency,
      totalCents: body.order.totalCents,
    },
  };
}
