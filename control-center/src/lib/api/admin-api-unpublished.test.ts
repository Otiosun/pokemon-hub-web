import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient } from './admin-api';

const API = 'https://admin-api.example.com';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const unpublished = [
  {
    releaseId: '33333333-3333-4333-8333-333333333333',
    releaseNo: '92',
    releaseName: 'Kanto balance pass',
    status: 'DRAFT',
    workflowState: 'EDITING',
    revision: '3',
    parentReleaseId: null,
    createdAt: '2026-08-31T22:00:00.000Z',
    validatedAt: null,
    recordedChangeCount: '3',
    lastChangedAt: '2026-08-31T22:15:00.000Z',
  },
] as const;

describe('AdminApiClient unpublished content state', () => {
  it('reads the backend-authoritative unpublished state without client authority fields', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(unpublished));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.listUnpublishedContent()).resolves.toEqual(unpublished);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(`${API}/admin/v1/content/unpublished`);
    expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('principalId');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('environment');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('capabilities');
  });

  it('fails closed when an unpublished release violates the backend contract', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse([
        {
          ...unpublished[0],
          status: 'PUBLISHED',
        },
      ]),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.listUnpublishedContent()).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_UNPUBLISHED_CONTENT_RESPONSE',
    });
  });
});
