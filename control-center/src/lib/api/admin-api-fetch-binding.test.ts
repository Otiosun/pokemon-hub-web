import { describe, expect, it } from 'vitest';
import { AdminApiClient } from './admin-api-core';

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

describe('AdminApiClient fetch receiver', () => {
  it('invokes an injected fetch implementation without rebinding its receiver', async () => {
    const strictFetch = function (this: unknown): Promise<Response> {
      if (this !== undefined) throw new TypeError('Illegal invocation');
      return Promise.resolve(sessionResponse());
    } as typeof fetch;

    const client = new AdminApiClient(API, strictFetch);

    await expect(client.getSession()).resolves.toMatchObject({
      principalId: '00000000-0000-4000-8000-000000000001',
      roles: ['OWNER_SECURITY_ADMIN'],
      environment: 'development',
    });
  });
});
