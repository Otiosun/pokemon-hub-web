import { describe, expect, it, vi } from 'vitest';
import { getPlayerPortalAdminAccess } from './playerPortalAdminClient';

describe('player portal admin access client', () => {
  it('treats an ordinary authenticated player as not_admin', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ admin: null }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(getPlayerPortalAdminAccess(fetcher as typeof fetch)).resolves.toEqual({
      status: 'not_admin',
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/admin/self', {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('returns the server-authorized capability snapshot', async () => {
    const admin = {
      capabilities: [
        { key: 'player.read', riskTier: 0 },
        { key: 'pokemon.edit.basic', riskTier: 3 },
      ],
      scopes: [{ scopeType: 'GLOBAL', scopeId: null }],
    };
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ admin }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(getPlayerPortalAdminAccess(fetcher as typeof fetch)).resolves.toEqual({
      status: 'authorized',
      admin,
    });
  });

  it('fails closed for anonymous and malformed authorization responses', async () => {
    const anonymous = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'UNAUTHENTICATED' }), { status: 401 }),
    );
    await expect(getPlayerPortalAdminAccess(anonymous as typeof fetch)).resolves.toEqual({
      status: 'unauthenticated',
    });

    const malformed = vi.fn(async () =>
      new Response(
        JSON.stringify({
          admin: {
            capabilities: [{ key: 'admin.role.manage', riskTier: 99 }],
            scopes: [],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    await expect(getPlayerPortalAdminAccess(malformed as typeof fetch)).rejects.toThrow(
      'Invalid admin access response',
    );
  });
});
