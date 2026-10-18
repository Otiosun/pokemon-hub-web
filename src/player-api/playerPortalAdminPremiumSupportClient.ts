export type PremiumSupportEventKind = 'NOTE' | 'REVIEW' | 'RESOLVED';

export interface PremiumSupportEvent {
  id: string;
  playerId: string;
  orderId: string | null;
  actorPrincipalId: string;
  kind: PremiumSupportEventKind;
  body: string;
  createdAt: string;
}

export type PremiumSupportListResult =
  | { status: 'ok'; events: PremiumSupportEvent[] }
  | { status: 'unavailable' | 'forbidden' | 'unauthenticated' };

export type PremiumSupportAppendResult =
  | { status: 'saved'; event: PremiumSupportEvent; replayed: boolean }
  | { status: 'unavailable' | 'forbidden' | 'unauthenticated' | 'invalid' | 'conflict' };

export interface PremiumSupportDraft {
  eventId: string;
  orderId: string | null;
  kind: PremiumSupportEventKind;
  body: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function isSupportEvent(input: unknown): input is PremiumSupportEvent {
  return record(input)
    && typeof input.id === 'string' && UUID.test(input.id)
    && typeof input.playerId === 'string' && UUID.test(input.playerId)
    && (input.orderId === null || (typeof input.orderId === 'string' && UUID.test(input.orderId)))
    && typeof input.actorPrincipalId === 'string' && UUID.test(input.actorPrincipalId)
    && (input.kind === 'NOTE' || input.kind === 'REVIEW' || input.kind === 'RESOLVED')
    && typeof input.body === 'string'
    && typeof input.createdAt === 'string'
    && Number.isFinite(new Date(input.createdAt).valueOf());
}

function endpoint(playerId: string): string {
  if (!UUID.test(playerId)) throw new Error('Identificador de jogador inválido.');
  return `/api/hub/admin/premium?playerId=${encodeURIComponent(playerId)}&resource=support`;
}

function blocked(status: number) {
  if (status === 401) return 'unauthenticated' as const;
  if (status === 403) return 'forbidden' as const;
  if (status === 404 || status === 503 || status === 502) return 'unavailable' as const;
  return null;
}

export async function getPremiumSupportEvents(
  playerId: string,
  fetcher: typeof fetch = fetch,
): Promise<PremiumSupportListResult> {
  const response = await fetcher(endpoint(playerId), {
    method: 'GET', credentials: 'include', cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  const failure = blocked(response.status);
  if (failure) return { status: failure };
  if (!response.ok) throw new Error('Não foi possível consultar os atendimentos.');
  const result: unknown = await response.json();
  if (!record(result) || !Array.isArray(result.events) || !result.events.every(isSupportEvent)) {
    throw new Error('Resposta de suporte inválida.');
  }
  return { status: 'ok', events: result.events };
}

export async function addPremiumSupportEvent(
  playerId: string,
  draft: PremiumSupportDraft,
  fetcher: typeof fetch = fetch,
): Promise<PremiumSupportAppendResult> {
  if (
    !UUID.test(draft.eventId)
    || (draft.orderId !== null && !UUID.test(draft.orderId))
    || !['NOTE', 'REVIEW', 'RESOLVED'].includes(draft.kind)
    || draft.body.trim().length < 8
    || draft.body.trim().length > 1400
  ) throw new Error('Preencha a observação e confira os identificadores.');

  const response = await fetcher(endpoint(playerId), {
    method: 'POST', credentials: 'include', cache: 'no-store',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ ...draft, body: draft.body.trim() }),
  });
  const failure = blocked(response.status);
  if (failure) return { status: failure };
  if (response.status === 409) return { status: 'conflict' };
  if (response.status === 400) return { status: 'invalid' };
  if (!response.ok) throw new Error('Não foi possível registrar o atendimento.');
  const result: unknown = await response.json();
  if (
    !record(result) || !isSupportEvent(result.event)
    || result.event.playerId !== playerId
    || result.event.id !== draft.eventId
    || typeof result.replayed !== 'boolean'
  ) throw new Error('Registro de suporte retornado pelo servidor é inválido.');
  return { status: 'saved', event: result.event, replayed: result.replayed };
}
