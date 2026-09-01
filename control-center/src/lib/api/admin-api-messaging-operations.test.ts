import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient, AdminApiError } from './admin-api';

const API_BASE_URL = 'https://admin-api.example.test';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-correlation-id': 'corr-messaging-ops' },
  });
}

const SNAPSHOT = {
  inbox: {
    counts: { RECEIVED: 1, PROCESSING: 2, PROCESSED: 10, FAILED: 1 },
    recent: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'FAILED',
        attempts: 3,
        receivedAt: '2026-09-01T10:00:00.000Z',
        processedAt: null,
        processingStartedAt: '2026-09-01T10:00:01.000Z',
      },
    ],
  },
  outbox: {
    counts: { PENDING: 2, SENDING: 1, SENT: 20, FAILED: 1, DEAD: 1 },
    recent: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        status: 'SENDING',
        attempts: 1,
        nextAttemptAt: '2026-09-01T10:01:00.000Z',
        createdAt: '2026-09-01T10:00:30.000Z',
        sentAt: null,
        sendingStartedAt: '2026-09-01T10:00:40.000Z',
      },
    ],
    deadLetter: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        status: 'DEAD',
        attempts: 8,
        nextAttemptAt: null,
        createdAt: '2026-09-01T09:00:00.000Z',
        sentAt: null,
        sendingStartedAt: null,
      },
    ],
  },
} as const;

describe('AdminApiClient messaging operations', () => {
  it('reads the exact metadata-only endpoint with credentials', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(SNAPSHOT));
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    await expect(client.getMessagingOperations()).resolves.toEqual(SNAPSHOT);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${API_BASE_URL}/admin/v1/messaging/operations`);
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', credentials: 'include' });
  });

  it.each([
    { ...SNAPSHOT, payload: { text: 'must-not-be-accepted' } },
    {
      ...SNAPSHOT,
      inbox: {
        ...SNAPSHOT.inbox,
        recent: [{ ...SNAPSHOT.inbox.recent[0], externalMessageId: 'secret-provider-id' }],
      },
    },
    {
      ...SNAPSHOT,
      outbox: {
        ...SNAPSHOT.outbox,
        recent: [{ ...SNAPSHOT.outbox.recent[0], destinationRef: 'secret-destination' }],
      },
    },
    {
      ...SNAPSHOT,
      outbox: {
        ...SNAPSHOT.outbox,
        deadLetter: [{ ...SNAPSHOT.outbox.deadLetter[0], lastErrorCode: 'secret-error' }],
      },
    },
    {
      ...SNAPSHOT,
      outbox: {
        ...SNAPSHOT.outbox,
        deadLetter: [{ ...SNAPSHOT.outbox.deadLetter[0], status: 'FAILED' }],
      },
    },
    {
      ...SNAPSHOT,
      inbox: { ...SNAPSHOT.inbox, counts: { ...SNAPSHOT.inbox.counts, FAILED: -1 } },
    },
  ])('fails closed on malformed or expanded messaging payload %#', async (body) => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(body));
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    const request = client.getMessagingOperations();
    await expect(request).rejects.toBeInstanceOf(AdminApiError);
    await expect(request).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_MESSAGING_OPERATIONS_RESPONSE',
    });
  });
});
