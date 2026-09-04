import { describe, expect, it } from 'vitest';
import { AdminApiClient as FeatureAdminApiClient } from './admin-api';
import { AdminApiClient as CoreAdminApiClient } from './admin-api-core';

const API = 'http://127.0.0.1:8787';

function sessionResponse(): Response {
  return new Response(
    JSON.stringify({
      principalId: '00000000-0000-4000-8000-000000000001',
      roles: ['OWNER_SECURITY_ADMIN'],
      capabilities: [],
      scopes: [{ scopeType: 'GLOBAL', scopeId: null }],
      environment: 'development',
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  );
}

function playerActivityResponse(): Response {
  return new Response(
    JSON.stringify({
      asOf: '2026-09-04T04:00:00.000Z',
      activePlayers: {
        last24Hours: 0,
        last7Days: 0,
        last30Days: 0,
      },
      returningPlayers7Days: 0,
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  );
}

describe('AdminApiClient fetch receiver', () => {
  it('invokes the core fetch implementation without rebinding its receiver', async () => {
    const strictFetch = function (this: unknown): Promise<Response> {
      if (this !== undefined) throw new TypeError('Illegal invocation');
      return Promise.resolve(sessionResponse());
    } as typeof fetch;

    const client = new CoreAdminApiClient(API, strictFetch);

    await expect(client.getSession()).resolves.toMatchObject({
      principalId: '00000000-0000-4000-8000-000000000001',
      roles: ['OWNER_SECURITY_ADMIN'],
      environment: 'development',
    });
  });

  it('invokes feature read fetches without rebinding their receiver', async () => {
    const strictFetch = function (this: unknown): Promise<Response> {
      if (this !== undefined) throw new TypeError('Illegal invocation');
      return Promise.resolve(playerActivityResponse());
    } as typeof fetch;

    const client = new FeatureAdminApiClient(API, strictFetch);

    await expect(client.getPlayerActivityAnalytics()).resolves.toMatchObject({
      activePlayers: {
        last24Hours: 0,
        last7Days: 0,
        last30Days: 0,
      },
      returningPlayers7Days: 0,
    });
  });
});
