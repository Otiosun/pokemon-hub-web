import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient } from './admin-api';

const API = 'https://admin-api.example.com';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('AdminApiClient content library', () => {
  it('encodes only the allowlisted GET filters and cursor', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: [], nextCursor: null }));
    const client = new AdminApiClient(API, fetchImpl);

    await client.searchContent(
      {
        query: 'Pikachu',
        resourceKind: 'SPECIES',
        releaseStatus: 'DRAFT',
        active: true,
        limit: 30,
      },
      'opaque-cursor',
    );

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(
      `${API}/admin/v1/content?query=Pikachu&resourceKind=SPECIES&releaseStatus=DRAFT&active=true&limit=30&cursor=opaque-cursor`,
    );
    expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('principalId');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('capabilities');
  });

  it('rejects malformed library rows instead of trusting the backend blindly', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        items: [
          {
            releaseId: 'not-a-uuid',
            releaseNo: '12',
            releaseName: 'Kanto v12',
            releaseStatus: 'DRAFT',
            releaseRevision: '3',
            resourceKind: 'SPECIES',
            resourceId: '00000000-0000-4000-8000-000000000025',
            slug: 'pikachu',
            displayName: 'Pikachu',
            active: true,
          },
        ],
        nextCursor: null,
      }),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.searchContent({ limit: 30 })).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_CONTENT_LIBRARY_RESPONSE',
    });
  });
});
