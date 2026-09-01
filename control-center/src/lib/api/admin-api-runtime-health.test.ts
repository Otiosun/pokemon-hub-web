import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient, AdminApiError } from './admin-api';

const API_BASE_URL = 'https://admin-api.example.test';
const DEPLOYMENT_REVISION = 'b'.repeat(40);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-correlation-id': 'corr-runtime-health' },
  });
}

const connectedRuntime = {
  environment: 'staging',
  runtime: {
    providerState: 'CONNECTED',
    deploymentRevision: DEPLOYMENT_REVISION,
    startedAt: '2026-09-01T09:55:00.000Z',
    lastConnectedAt: '2026-09-01T09:56:00.000Z',
    lastHeartbeatAt: '2026-09-01T10:05:00.000Z',
    lastDisconnectAt: null,
    stoppedAt: null,
  },
} as const;

describe('AdminApiClient runtime WhatsApp health', () => {
  it('reads the exact server-owned runtime health endpoint with credentials', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(connectedRuntime));
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    await expect(client.getRuntimeWhatsappHealth()).resolves.toEqual(connectedRuntime);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${API_BASE_URL}/admin/v1/runtime/whatsapp/health`);
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
  });

  it('accepts the factual absence of runtime evidence', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ environment: 'production', runtime: null }),
    );
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    await expect(client.getRuntimeWhatsappHealth()).resolves.toEqual({
      environment: 'production',
      runtime: null,
    });
  });

  it.each([
    { ...connectedRuntime, environment: 'preview' },
    {
      ...connectedRuntime,
      runtime: { ...connectedRuntime.runtime, providerState: 'HEALTHY' },
    },
    {
      ...connectedRuntime,
      runtime: { ...connectedRuntime.runtime, deploymentRevision: 'not-a-sha' },
    },
    {
      ...connectedRuntime,
      runtime: { ...connectedRuntime.runtime, lastHeartbeatAt: '' },
    },
    {
      ...connectedRuntime,
      runtime: { ...connectedRuntime.runtime, whatsappSessionKey: 'must-not-be-accepted' },
    },
    {
      ...connectedRuntime,
      runtime: { ...connectedRuntime.runtime, shutdownReason: 'must-not-be-accepted' },
    },
  ])('fails closed on malformed or expanded runtime health payload %#', async (body) => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(body));
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    const request = client.getRuntimeWhatsappHealth();
    await expect(request).rejects.toBeInstanceOf(AdminApiError);
    await expect(request).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_RUNTIME_HEALTH_RESPONSE',
    });
  });
});
