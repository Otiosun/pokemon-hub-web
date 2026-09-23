import { describe, expect, it } from 'vitest';
import { getPlayerPortalAdmin } from './playerPortalAdminClient';

function response(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

describe('player portal admin client', () => {
  it('treats a missing session as unauthenticated', async () => {
    const result = await getPlayerPortalAdmin(() => response(401, { error: 'UNAUTHENTICATED' }));

    expect(result).toEqual({ status: 'unauthenticated' });
  });

  it('keeps ordinary authenticated players outside the admin surface', async () => {
    const result = await getPlayerPortalAdmin(() => response(200, { admin: null }));

    expect(result).toEqual({ status: 'not-admin' });
  });

  it('accepts backend-owned admin capability discovery', async () => {
    const result = await getPlayerPortalAdmin(() =>
      response(200, {
        admin: {
          principalId: '00000000-0000-4000-8000-000000000042',
          capabilities: ['player.read', 'pokemon.read', 'admin.role.assign'],
        },
      }),
    );

    expect(result).toEqual({
      status: 'admin',
      admin: {
        principalId: '00000000-0000-4000-8000-000000000042',
        capabilities: ['player.read', 'pokemon.read', 'admin.role.assign'],
      },
    });
  });

  it('rejects malformed admin capability payloads', async () => {
    await expect(
      getPlayerPortalAdmin(() =>
        response(200, {
          admin: {
            principalId: 'not-a-principal-id',
            capabilities: ['player.read'],
          },
        }),
      ),
    ).rejects.toThrow('Invalid admin portal response');
  });
});
