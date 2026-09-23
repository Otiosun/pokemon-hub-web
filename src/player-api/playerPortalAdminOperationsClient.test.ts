import { describe, expect, it } from 'vitest';
import {
  advanceAdminOperation,
  listAdminOperations,
  prepareAdminOperation,
} from './playerPortalAdminOperationsClient';

const operationId = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('admin operation client', () => {
  it('parses the capability-filtered operation catalog', async () => {
    const result = await listAdminOperations(() =>
      jsonResponse(200, {
        operations: [
          {
            kind: 'MUTATION',
            operationType: 'pokemon.create',
            capabilityKey: 'pokemon.create',
            riskTier: 3,
            authorizationMode: 'SUBJECT',
            policy: {
              version: 1,
              requiresReason: true,
              requiresExpectedRevision: false,
              requiresSimulation: false,
              requiresConfirmation: true,
              requiredApprovals: 0,
            },
          },
        ],
      }),
    );

    expect(result).toEqual({
      status: 'ok',
      operations: [
        expect.objectContaining({
          operationType: 'pokemon.create',
          capabilityKey: 'pokemon.create',
          riskTier: 3,
        }),
      ],
    });
  });

  it('prepares an audited operation without sending an actor principal', async () => {
    let url = '';
    let init: RequestInit | undefined;

    const result = await prepareAdminOperation(
      {
        requestId,
        operationType: 'pokemon.create',
        input: {
          playerId: '33333333-3333-4333-8333-333333333333',
          formId: '44444444-4444-4444-8444-444444444444',
          level: 25,
        },
        reason: 'Restore event reward',
      },
      (requestUrl, requestInit) => {
        url = String(requestUrl);
        init = requestInit;
        return jsonResponse(200, {
          operationId,
          status: 'PENDING_CONFIRMATION',
          replayed: false,
          result: null,
        });
      },
    );

    expect(url).toBe('/api/hub/admin/operations');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toEqual({
      requestId,
      operationType: 'pokemon.create',
      input: {
        playerId: '33333333-3333-4333-8333-333333333333',
        formId: '44444444-4444-4444-8444-444444444444',
        level: 25,
      },
      reason: 'Restore event reward',
    });
    expect(body).not.toHaveProperty('principalId');
    expect(result).toEqual({
      status: 'ok',
      operationId,
      operationStatus: 'PENDING_CONFIRMATION',
      replayed: false,
      result: null,
    });
  });

  it('advances confirmations and second-admin approvals through explicit routes', async () => {
    let approvalBody: unknown = null;

    const confirmed = await advanceAdminOperation(operationId, 'confirm', {}, (url, init) => {
      expect(String(url)).toBe(`/api/hub/admin/operations/${operationId}/confirm`);
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeUndefined();
      return jsonResponse(200, {
        operationId,
        status: 'READY',
        result: null,
      });
    });
    expect(confirmed).toEqual({
      status: 'ok',
      operationId,
      operationStatus: 'READY',
      result: null,
    });

    const approved = await advanceAdminOperation(
      operationId,
      'approve',
      { reason: 'Second-admin review' },
      (_url, init) => {
        approvalBody = JSON.parse(String(init?.body));
        return jsonResponse(200, {
          operationId,
          status: 'READY',
          result: null,
        });
      },
    );
    expect(approvalBody).toEqual({ reason: 'Second-admin review' });
    expect(approved.status).toBe('ok');
  });

  it('does not turn administrative rejection responses into success', async () => {
    const result = await advanceAdminOperation(operationId, 'apply', {}, () =>
      jsonResponse(409, { error: 'ADMIN_INVALID_OPERATION_STATE' }),
    );

    expect(result).toEqual({
      status: 'rejected',
      code: 'ADMIN_INVALID_OPERATION_STATE',
    });
  });

  it('rejects malformed catalog data and malformed expected revisions locally', async () => {
    await expect(
      listAdminOperations(() =>
        jsonResponse(200, {
          operations: [
            {
              kind: 'MUTATION',
              operationType: 'pokemon.create',
              capabilityKey: 'pokemon.create',
              riskTier: 99,
              authorizationMode: 'SUBJECT',
              policy: {},
            },
          ],
        }),
      ),
    ).rejects.toThrow('Invalid admin operation catalog response');

    await expect(
      prepareAdminOperation(
        {
          requestId,
          operationType: 'pokemon.progress.correct',
          input: {},
          expectedRevision: '-1',
        },
        () => jsonResponse(500, {}),
      ),
    ).rejects.toThrow('Invalid admin operation expected revision');
  });
});
