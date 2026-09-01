import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient } from './admin-api';

const API = 'https://admin-api.example.com';
const RELEASE_ID = '33333333-3333-4333-8333-333333333333';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const validationPreview = {
  releaseId: RELEASE_ID,
  valid: false,
  issues: [
    {
      code: 'FORM_SPECIES_MISSING',
      path: 'forms.0.speciesId',
      message: 'Form references a species absent from this release',
    },
  ],
} as const;

describe('AdminApiClient content release validation preview', () => {
  it('reads authoritative validation blockers without browser authority fields', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(validationPreview));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.previewContentReleaseValidation(RELEASE_ID)).resolves.toEqual(
      validationPreview,
    );

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(`${API}/admin/v1/content/releases/${RELEASE_ID}/validation`);
    expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('principalId');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('environment');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('capabilities');
  });

  it('fails closed when a validation issue violates the backend contract', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        ...validationPreview,
        issues: [{ code: '', path: 'forms.0.speciesId', message: 'broken' }],
      }),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.previewContentReleaseValidation(RELEASE_ID)).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_CONTENT_RELEASE_VALIDATION_RESPONSE',
    });
  });
});
