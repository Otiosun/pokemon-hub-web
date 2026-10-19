export type PremiumManualAction = 'approve' | 'deliver';
export interface PremiumManualActionRequest {
  requestId: string;
  humanId: string;
  expectedRevision: string;
  reason: string;
  confirmed: true;
}
export type PremiumManualActionResult =
  | { status: 'ok'; operation: 'PAYMENT_APPROVED' | '2XP_DELIVERED'; replayed: boolean }
  | { status: 'unavailable' | 'unauthenticated' | 'forbidden' | 'stale' | 'error'; detail?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function submitManualPremiumAction(
  orderId: string,
  action: PremiumManualAction,
  input: PremiumManualActionRequest,
  fetcher: typeof fetch = fetch,
): Promise<PremiumManualActionResult> {
  if (
    !UUID.test(orderId) || !UUID.test(input.requestId) ||
    !/^PB-[0-9]{8,20}$/.test(input.humanId) ||
    !/^[0-9]{1,20}$/.test(input.expectedRevision) ||
    input.reason.trim().length < 8 || input.reason.trim().length > 400 ||
    input.confirmed !== true ||
    (action !== 'approve' && action !== 'deliver')
  ) throw new Error('Confira os dados e a justificativa antes de confirmar.');

  const response = await fetcher(`/api/hub/admin/premium/orders/${orderId}/${action}`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ ...input, reason: input.reason.trim() }),
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (response.status === 404 || response.status === 502 || response.status === 503) {
    return { status: 'unavailable' };
  }
  if (response.status === 409) return { status: 'stale' };
  if (!response.ok) return { status: 'error', detail: `HTTP_${response.status}` };
  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null || !('operation' in data) ||
      !('replayed' in data) ||
      (data.operation !== 'PAYMENT_APPROVED' && data.operation !== '2XP_DELIVERED') ||
      data.replayed !== true && data.replayed !== false ||
      data.operation !== (action === 'approve' ? 'PAYMENT_APPROVED' : '2XP_DELIVERED')) {
    throw new Error('O servidor retornou uma confirmação inválida.');
  }
  return {
    status: 'ok',
    operation: data.operation,
    replayed: data.replayed,
  };
}
