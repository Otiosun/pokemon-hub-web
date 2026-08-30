import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient } from './admin-api';

const API = 'https://admin-api.example.com';
const CSRF_HEADER = 'x-control-center-csrf';
const CSRF_VALUE = '1';
const TARGET_ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const SUPPORT_ROLE_ID = '33333333-3333-4333-8333-333333333333';

function jsonResponse(
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('AdminApiClient mutation preparation', () => {
  it('posts only the allowlisted operation body with browser credentials and explicit CSRF guard', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          operation: {
            id: '44444444-4444-4444-8444-444444444444',
            operationType: 'admin.role.assign',
            target: { type: 'ADMIN_PRINCIPAL', id: TARGET_ADMIN_ID },
            riskTier: 4,
            authorizationMode: 'GLOBAL_ONLY',
            status: 'VALIDATED',
            reason: 'Grant support role',
            expectedRevision: '0',
            correlationId: '55555555-5555-4555-8555-555555555555',
            policy: {
              version: 1,
              requiresReason: true,
              requiresExpectedRevision: true,
              requiresSimulation: true,
              requiresConfirmation: true,
              requiredApprovals: 1,
            },
            revision: '0',
          },
          replayed: false,
        },
        200,
        { 'x-correlation-id': '55555555-5555-4555-8555-555555555555' },
      ),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(
      client.prepareOperation({
        operationType: 'admin.role.assign',
        input: { principalId: TARGET_ADMIN_ID, roleId: SUPPORT_ROLE_ID },
        reason: 'Grant support role',
        expectedRevision: '0',
        idempotencyKey: 'role-assign-0001',
      }),
    ).resolves.toMatchObject({
      operation: {
        operationType: 'admin.role.assign',
        riskTier: 4,
        correlationId: '55555555-5555-4555-8555-555555555555',
      },
      replayed: false,
    });

    const [url, options] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(`${API}/admin/v1/operations/prepare`);
    expect(options).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        [CSRF_HEADER]: CSRF_VALUE,
      },
    });
    expect(typeof options?.body).toBe('string');
    expect(JSON.parse(String(options?.body))).toEqual({
      operationType: 'admin.role.assign',
      input: { principalId: TARGET_ADMIN_ID, roleId: SUPPORT_ROLE_ID },
      reason: 'Grant support role',
      expectedRevision: '0',
      idempotencyKey: 'role-assign-0001',
    });

    const serializedCall = JSON.stringify(fetchImpl.mock.calls);
    expect(serializedCall).not.toContain('cf-access-jwt-assertion');
    expect(serializedCall).not.toContain('capabilities');
    expect(serializedCall).not.toContain('scopes');
    expect(serializedCall).not.toContain('environment');
    expect(serializedCall).not.toContain('csrfToken');
  });

  it('rejects malformed success payloads instead of fabricating mutation state', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        operation: {
          id: 'not-a-safe-contract',
          operationType: 'admin.role.assign',
          riskTier: 99,
        },
        replayed: false,
      }),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(
      client.prepareOperation({
        operationType: 'admin.role.assign',
        input: { principalId: TARGET_ADMIN_ID, roleId: SUPPORT_ROLE_ID },
        reason: 'Grant support role',
        expectedRevision: '0',
        idempotencyKey: 'role-assign-0002',
      }),
    ).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_PREPARED_OPERATION_RESPONSE',
    });
  });
});
