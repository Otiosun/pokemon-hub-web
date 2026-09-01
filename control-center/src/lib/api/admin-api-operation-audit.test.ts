import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient, AdminApiError } from './admin-api';

const API_BASE_URL = 'https://admin-api.example.test';
const OPERATION_ID = '33333333-3333-4333-8333-333333333333';
const PRINCIPAL_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '44444444-4444-4444-8444-444444444444';

const snapshot = {
  operation: {
    id: OPERATION_ID,
    principalId: PRINCIPAL_ID,
    capabilityKey: 'admin.role.assign',
    operationType: 'admin.role.assign',
    targetType: 'ADMIN_PRINCIPAL',
    targetId: TARGET_ID,
    riskTier: 4,
    status: 'APPLIED',
    correlationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    reasonRecorded: true,
    expectedRevision: '7',
    revision: '4',
    policy: {
      version: 1,
      requiresReason: true,
      requiresExpectedRevision: true,
      requiresSimulation: true,
      requiresConfirmation: true,
      requiredApprovals: 1,
    },
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:04:00.000Z',
    appliedAt: '2026-09-01T12:04:00.000Z',
  },
  timeline: [
    {
      kind: 'PROPOSED',
      occurredAt: '2026-09-01T12:00:00.000Z',
      actorPrincipalId: PRINCIPAL_ID,
      action: 'admin.role.assign.proposed',
      decision: null,
      resourceType: null,
      resourceId: null,
      eventId: OPERATION_ID,
    },
    {
      kind: 'APPROVAL',
      occurredAt: '2026-09-01T12:03:00.000Z',
      actorPrincipalId: '55555555-5555-4555-8555-555555555555',
      action: 'admin.role.assign.approval',
      decision: 'APPROVED',
      resourceType: null,
      resourceId: null,
      eventId: '66666666-6666-4666-8666-666666666666',
    },
    {
      kind: 'CHANGE',
      occurredAt: '2026-09-01T12:04:00.000Z',
      actorPrincipalId: null,
      action: 'admin.role.assign.change',
      decision: null,
      resourceType: 'ADMIN_PRINCIPAL',
      resourceId: TARGET_ID,
      eventId: '77777777-7777-4777-8777-777777777777',
    },
    {
      kind: 'AUDIT',
      occurredAt: '2026-09-01T12:04:00.000Z',
      actorPrincipalId: PRINCIPAL_ID,
      action: 'admin.role.assign',
      decision: null,
      resourceType: 'ADMIN_PRINCIPAL',
      resourceId: TARGET_ID,
      eventId: '88888888-8888-4888-8888-888888888888',
    },
  ],
} as const;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-correlation-id': 'corr-operation-audit' },
  });
}

describe('AdminApiClient AdminOperation audit reconstruction', () => {
  it('reads one exact operation audit with credentials and no client-owned authority', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(snapshot));
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    await expect(client.getAdminOperationAudit(OPERATION_ID)).resolves.toEqual(snapshot);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      `${API_BASE_URL}/admin/v1/operations/${OPERATION_ID}/audit`,
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', credentials: 'include' });
  });

  it.each([
    { ...snapshot, input: { roleId: TARGET_ID } },
    { ...snapshot, result: { applied: true } },
    { ...snapshot, reason: 'must-not-be-exposed' },
    { ...snapshot, metadata: { source: 'raw' } },
    { ...snapshot, operation: { ...snapshot.operation, id: PRINCIPAL_ID } },
    { ...snapshot, operation: { ...snapshot.operation, riskTier: 5 } },
    { ...snapshot, operation: { ...snapshot.operation, status: 'UNKNOWN' } },
    {
      ...snapshot,
      operation: { ...snapshot.operation, policy: { ...snapshot.operation.policy, raw: true } },
    },
    {
      ...snapshot,
      timeline: [{ ...snapshot.timeline[0], payload: { forbidden: true } }],
    },
    {
      ...snapshot,
      timeline: [{ ...snapshot.timeline[0], actorPrincipalId: 'not-a-uuid' }],
    },
    {
      ...snapshot,
      timeline: [{ ...snapshot.timeline[0], kind: 'REPLAY' }],
    },
    {
      ...snapshot,
      timeline: [{ ...snapshot.timeline[1], decision: 'OVERRIDDEN' }],
    },
  ])('fails closed on malformed or expanded audit payload %#', async (body) => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(body));
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    const request = client.getAdminOperationAudit(OPERATION_ID);
    await expect(request).rejects.toBeInstanceOf(AdminApiError);
    await expect(request).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_ADMIN_OPERATION_AUDIT_RESPONSE',
    });
  });
});
