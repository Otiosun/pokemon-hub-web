export type AdminPlayerIdentityChangeInput = {
  requestId: string;
  newWhatsApp: string;
  reason: string;
  expectedRevision: string;
  confirmed: true;
};

export type AdminPlayerIdentityChangeResult =
  | {
      status: 'ok';
      operationId: string;
      replayed: boolean;
      result: Record<string, unknown> | null;
    }
  | { status: 'unauthenticated' | 'forbidden' }
  | { status: 'rejected'; code: string };

type Fetcher = typeof fetch;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVISION_PATTERN = /^(0|[1-9][0-9]*)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function changeAdminPlayerWhatsAppIdentity(
  playerId: string,
  input: AdminPlayerIdentityChangeInput,
  fetcher: Fetcher = fetch,
): Promise<AdminPlayerIdentityChangeResult> {
  if (!UUID_PATTERN.test(playerId)) throw new Error('Invalid admin player id');
  if (!UUID_PATTERN.test(input.requestId)) throw new Error('Invalid identity change request id');
  if (!REVISION_PATTERN.test(input.expectedRevision)) {
    throw new Error('Invalid player revision');
  }

  const response = await fetcher(
    `/api/hub/admin/player-identity?playerId=${encodeURIComponent(playerId)}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const code =
      isRecord(body) && typeof body.error === 'string' ? body.error : `HTTP_${response.status}`;
    return { status: 'rejected', code };
  }

  if (
    !isRecord(body) ||
    typeof body.operationId !== 'string' ||
    !UUID_PATTERN.test(body.operationId) ||
    body.status !== 'APPLIED' ||
    typeof body.replayed !== 'boolean' ||
    !(body.result === null || isRecord(body.result))
  ) {
    throw new Error('Invalid admin player identity change response');
  }

  return {
    status: 'ok',
    operationId: body.operationId,
    replayed: body.replayed,
    result: body.result,
  };
}
