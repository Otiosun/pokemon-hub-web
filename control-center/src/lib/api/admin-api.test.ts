import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient, AdminApiError } from './admin-api';

const API = 'https://admin-api.example.com';

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

describe('AdminApiClient', () => {
  it('loads session with credentials include and no browser-supplied authority headers', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        principalId: '11111111-1111-4111-8111-111111111111',
        roles: ['OWNER_SECURITY_ADMIN'],
        capabilities: [{ key: 'player.read_sensitive', riskTier: 0 }],
        scopes: [{ scopeType: 'GLOBAL', scopeId: null }],
        environment: 'staging',
      }),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getSession()).resolves.toMatchObject({
      roles: ['OWNER_SECURITY_ADMIN'],
      environment: 'staging',
    });
    expect(fetchImpl).toHaveBeenCalledWith(`${API}/admin/v1/session`, {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('principalId');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('cf-access-jwt-assertion');
  });

  it('encodes only allowlisted Player 360 search query fields', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: [], nextCursor: null }));
    const client = new AdminApiClient(API, fetchImpl);

    await client.searchPlayers({
      status: 'ACTIVE',
      trainerNamePrefix: 'Ash Ketchum',
      includeSensitive: false,
      limit: 25,
    });

    const [url] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(
      `${API}/admin/v1/players?status=ACTIVE&trainerNamePrefix=Ash+Ketchum&includeSensitive=false&limit=25`,
    );
  });

  it('surfaces safe server error and correlation id', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'ADMIN_AUTHORIZATION_DENIED',
            message: 'Administrative access denied',
            correlationId: 'corr-123',
          },
        },
        403,
      ),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getSession()).rejects.toMatchObject({
      kind: 'forbidden',
      status: 403,
      code: 'ADMIN_AUTHORIZATION_DENIED',
      correlationId: 'corr-123',
    });
  });

  it('normalizes network failures without exposing browser internals', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error('socket secret'));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getSession()).rejects.toEqual(
      new AdminApiError(
        'network',
        'Não foi possível alcançar a Admin API.',
        null,
        'NETWORK_ERROR',
        null,
      ),
    );
  });

  it('rejects malformed session success payloads instead of inventing authority', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        principalId: '11111111-1111-4111-8111-111111111111',
        roles: ['OWNER_SECURITY_ADMIN'],
        capabilities: 'everything',
        scopes: [],
        environment: 'production',
      }),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getSession()).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_SESSION_RESPONSE',
    });
  });
});
