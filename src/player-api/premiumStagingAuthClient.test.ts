import { describe, expect, it, vi } from 'vitest';
import {
  readPremiumStageSession,
  exchangePremiumStageTicket,
  signOutPremiumStage,
} from './premiumStagingAuthClient';

const principal = '11111111-1111-4111-8111-111111111111';
const player = '22222222-2222-4222-8222-222222222222';

describe('Premium staging-only session client', () => {
  it('authorizes only a staging owner, not an ordinary admin or player', async () => {
    const owner = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(
      JSON.stringify({ admin: { principalId: principal, owner: true, capabilities: ['central.view'] } }),
      { status: 200 },
    ));
    expect(await readPremiumStageSession('owner', owner)).toMatchObject({
      status: 'ready', label: 'PROPRIETÁRIO DE STAGING',
    });
    expect(owner.mock.calls[0]![0]).toBe('/api/hub/admin/premium-auth/self');
    expect(owner.mock.calls[0]![1]?.credentials).toBe('include');

    const notOwner = vi.fn(async () => new Response(
      JSON.stringify({ admin: { principalId: principal, owner: false, capabilities: ['central.view'] } }),
      { status: 200 },
    ));
    expect((await readPremiumStageSession('owner', notOwner)).status).toBe('forbidden');

    const playerSession = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(
      JSON.stringify({ profile: { playerId: player } }), { status: 200 },
    ));
    expect((await readPremiumStageSession('player', playerSession)).status).toBe('ready');
    expect(playerSession.mock.calls[0]![0]).toBe('/api/hub/admin/premium-auth/player');
  });

  it('returns unavailable or unauthenticated without inventing a staging session', async () => {
    for (const code of [401, 404, 502, 503]) {
      const fetcher = vi.fn(async () => new Response(null, { status: code }));
      expect((await readPremiumStageSession('owner', fetcher)).status)
        .toBe(code === 401 ? 'unauthenticated' : 'unavailable');
    }
  });

  it('accepts only ticket-shaped one-time staging credentials and never saves them', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response('{}', { status: 200 }));
    expect(await exchangePremiumStageTicket('not-a-ticket', fetcher)).toBe('invalid');
    expect(fetcher).not.toHaveBeenCalled();
    const ticket = 'A'.repeat(43);
    expect(await exchangePremiumStageTicket(ticket, fetcher)).toBe('ok');
    expect(fetcher.mock.calls[0]![0]).toBe('/api/hub/admin/premium-auth/exchange');
    expect(fetcher.mock.calls[0]![1]?.body).toBe(JSON.stringify({ ticket }));
    expect(fetcher.mock.calls[0]![1]?.credentials).toBe('include');
    await signOutPremiumStage(fetcher);
    expect(fetcher.mock.calls[1]![0]).toBe('/api/hub/admin/premium-auth/logout');
  });
});
