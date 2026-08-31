import { describe, expect, it, vi } from 'vitest';
import { logoutCurrentSession } from './logout';

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

describe('current administrative session logout', () => {
  it('revokes through the current-session endpoint with CSRF and accepts only the fixed Access path', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ logoutPath: '/cdn-cgi/access/logout' }));

    await expect(logoutCurrentSession(API, fetchImpl)).resolves.toEqual({
      logoutPath: '/cdn-cgi/access/logout',
    });
    expect(fetchImpl).toHaveBeenCalledWith(`${API}/admin/v1/session/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-control-center-csrf': '1',
      },
      body: '{}',
    });
  });

  it('rejects any server-supplied logout redirect outside the fixed Access path', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ logoutPath: 'https://attacker.example.com/' }));

    await expect(logoutCurrentSession(API, fetchImpl)).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_LOGOUT_RESPONSE',
    });
  });

  it('does not manufacture a redirect when local revocation fails', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'ADMIN_UNAUTHENTICATED',
            message: 'Administrative session is not active',
            correlationId: 'corr-logout',
          },
        },
        401,
      ),
    );

    await expect(logoutCurrentSession(API, fetchImpl)).rejects.toMatchObject({
      kind: 'unauthenticated',
      status: 401,
      code: 'ADMIN_UNAUTHENTICATED',
      correlationId: 'corr-logout',
    });
  });
});
