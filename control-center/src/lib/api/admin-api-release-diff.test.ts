import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient } from './admin-api';

const API = 'https://admin-api.example.com';
const FROM_RELEASE_ID = '22222222-2222-4222-8222-222222222222';
const TO_RELEASE_ID = '33333333-3333-4333-8333-333333333333';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const releaseDiff = {
  fromReleaseId: FROM_RELEASE_ID,
  toReleaseId: TO_RELEASE_ID,
  sections: [
    { category: 'species', added: 1, removed: 0, changed: 2 },
    { category: 'moves', added: 0, removed: 1, changed: 0 },
  ],
} as const;

describe('AdminApiClient content release diff', () => {
  it('reads the backend-authoritative release diff without client authority fields', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(releaseDiff));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(
      client.diffContentRelease({
        fromReleaseId: FROM_RELEASE_ID,
        toReleaseId: TO_RELEASE_ID,
      }),
    ).resolves.toEqual(releaseDiff);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(
      `${API}/admin/v1/content/releases/diff?fromReleaseId=${FROM_RELEASE_ID}&toReleaseId=${TO_RELEASE_ID}`,
    );
    expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('principalId');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('environment');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('capabilities');
  });

  it('fails closed when a diff section violates the backend contract', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        ...releaseDiff,
        sections: [{ category: 'unknown', added: 1, removed: 0, changed: 0 }],
      }),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(
      client.diffContentRelease({
        fromReleaseId: FROM_RELEASE_ID,
        toReleaseId: TO_RELEASE_ID,
      }),
    ).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_CONTENT_RELEASE_DIFF_RESPONSE',
    });
  });
});
