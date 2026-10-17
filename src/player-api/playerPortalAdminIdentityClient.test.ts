import { describe, expect, it } from 'vitest';
import { changeAdminPlayerWhatsAppIdentity } from './playerPortalAdminIdentityClient';

const playerId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';

const input = {
  requestId,
  newWhatsApp: '+55 (79) 99999-1234',
  reason: 'Pedido confirmado pelo jogador',
  expectedRevision: '7',
  confirmed: true,
} as const;

describe('changeAdminPlayerWhatsAppIdentity', () => {
  it('posts only to the dedicated identity proxy with credentials', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fetcher: typeof fetch = async (resource, init) => {
      capturedUrl = String(resource);
      capturedInit = init;
      return new Response(
        JSON.stringify({
          operationId: '44444444-4444-4444-8444-444444444444',
          status: 'APPLIED',
          replayed: false,
          result: { changed: true, newIdentityLast4: '1234', playerRevision: '8' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };

    const result = await changeAdminPlayerWhatsAppIdentity(playerId, input, fetcher);

    expect(capturedUrl).toBe(`/api/hub/admin/player-identity?playerId=${playerId}`);
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.credentials).toBe('include');
    expect(JSON.parse(String(capturedInit?.body))).toEqual(input);
    expect(result).toMatchObject({ status: 'ok', replayed: false });
  });

  it('returns backend conflicts as rejected operations without retrying', async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: 'ADMIN_REVISION_CONFLICT' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      });
    };

    await expect(changeAdminPlayerWhatsAppIdentity(playerId, input, fetcher)).resolves.toEqual({
      status: 'rejected',
      code: 'ADMIN_REVISION_CONFLICT',
    });
    expect(calls).toBe(1);
  });

  it('rejects malformed revisions before making a request', async () => {
    let called = false;
    const fetcher: typeof fetch = async () => {
      called = true;
      return new Response(null, { status: 500 });
    };

    await expect(
      changeAdminPlayerWhatsAppIdentity(
        playerId,
        { ...input, expectedRevision: '-1' },
        fetcher,
      ),
    ).rejects.toThrow('Invalid player revision');
    expect(called).toBe(false);
  });
});
