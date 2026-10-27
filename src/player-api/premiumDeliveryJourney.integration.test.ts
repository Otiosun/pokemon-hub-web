import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import premiumProxy from '../../api/hub/admin/[...path]';
import { HUB_COOKIE } from './premiumStagingSessionCookies';
import {
  readManualDeliveryCatalog,
  readManualDeliveryHistory,
  submitManualDelivery,
} from './manualPremiumDeliveryClient';

const hub = 'https://hub.example.org';
const api = 'https://pokemon-api.otiosunbots.xyz';
const cookie = `${HUB_COOKIE}=synthetic.session`;
const playerId = '11111111-1111-4111-8111-111111111111';
const actorId = '33333333-3333-4333-8333-333333333333';
const xpRequestId = '22222222-2222-4222-8222-222222222222';
const luckRequestId = '44444444-4444-4444-8444-444444444444';
const secondRequestId = '55555555-5555-4555-8555-555555555555';

type Role = 'owner' | 'delegate' | 'ordinary-adm' | 'player';
type RequestPayload = {
  requestId: string;
  playerId: string;
  sku: string;
  quantity: number;
  reason: string;
};
type LedgerEntry = {
  id: string;
  requestId: string;
  entitlementKey: string;
  durationSeconds: number | null;
  actorPrincipalId: string;
  sku: string;
  quantity: number;
  reason: string;
  createdAt: string;
};

/** End-to-end HTTP-contract fixture. Storage and API are SYNTHETIC, never live. */
function syntheticPremiumBridge() {
  let role: Role = 'delegate';
  let loseFirstResponse = false;
  const fingerprintByRequest = new Map<string, string>();
  const entries: LedgerEntry[] = [];

  const upstream = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    // The Hub BFF must forward a scoped normal Hub session, never a staging cookie.
    expect(new Headers(init?.headers).get('cookie')).toBe(cookie);
    if (url === api + '/v1/hub/admin/self') {
      if (role === 'player') return Response.json({ admin: null });
      const capabilities = role === 'owner'
        ? ['central.view']
        : role === 'delegate'
          ? ['central.view', 'premium.delivery.grant', 'player.read']
          : ['central.view', 'player.read', 'reward.grant'];
      return Response.json({ admin: {
        principalId: actorId, owner: role === 'owner', capabilities,
      } });
    }
    if (url === api + '/v1/hub/admin/premium/delivery/catalog') {
      return Response.json({ products: [
        { sku: '2XP', title: 'XP em Dobro', maxQuantity: 52,
          entitlementKey: 'XP_2X', grantModel: 'TIMED', durationSecondsPerUnit: 604800 },
        { sku: 'LUCK', title: 'Bênção da Sorte', maxQuantity: 1,
          entitlementKey: 'CAPTURE_LUCK_2X', grantModel: 'PERMANENT',
          durationSecondsPerUnit: null },
      ] });
    }
    if (url === api + `/v1/hub/admin/premium/players/${playerId}/deliveries`) {
      return Response.json({ deliveries: [...entries].reverse() });
    }
    if (url === api + '/v1/hub/admin/premium/delivery' && init?.method === 'POST') {
      const input = JSON.parse(String(init.body)) as RequestPayload;
      const fingerprint = JSON.stringify(input);
      const previous = fingerprintByRequest.get(input.requestId);
      if (previous !== undefined) {
        if (previous !== fingerprint) {
          return Response.json({ error: 'IDEMPOTENCY_CONFLICT' }, { status: 409 });
        }
        return Response.json({ applied: true, replayed: true,
          requestId: input.requestId, entitlement: { playerId: input.playerId } });
      }
      const durationSeconds = input.sku === '2XP' ? 604800 * input.quantity : null;
      fingerprintByRequest.set(input.requestId, fingerprint);
      entries.push({
        id: input.requestId, requestId: input.requestId,
        entitlementKey: input.sku === '2XP' ? 'XP_2X' : 'CAPTURE_LUCK_2X',
        durationSeconds, actorPrincipalId: actorId,
        sku: input.sku, quantity: input.quantity, reason: input.reason,
        createdAt: '2026-10-27T00:00:00.000Z',
      });
      if (loseFirstResponse) {
        loseFirstResponse = false;
        throw new Error('Synthetic connection lost AFTER applying the grant');
      }
      return Response.json({ applied: true, replayed: false,
        requestId: input.requestId, entitlement: { playerId: input.playerId } },
      { status: 201 });
    }
    throw new Error('Unexpected upstream route in synthetic Premium fixture: ' + url);
  });

  vi.stubGlobal('fetch', upstream);

  // Simulate the real browser's cookie+Origin transport to the Hub BFF.
  const browserFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? 'GET';
    const headers = new Headers(init?.headers);
    headers.set('cookie', cookie);
    if (method === 'POST') headers.set('origin', hub);
    return premiumProxy.fetch(new Request(new URL(String(input), hub), {
      method,
      headers,
      ...(method === 'POST' ? { body: init?.body } : {}),
    }));
  };
  return {
    browserFetch,
    upstream,
    entries,
    actingAs: (next: Role) => { role = next; },
    dropNextResponse: () => { loseFirstResponse = true; },
  };
}

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('PLAYER_PORTAL_API_BASE_URL', api);
  vi.stubEnv('PREMIUM_LOCAL_ENABLED', '1');
  vi.stubEnv('PREMIUM_LOCAL_APPROVED_ORIGIN', api);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Premium synthetic journey: client → BFF → backend contract', () => {
  it('lets an explicit delegate issue 2XP and LUCK, replay safely, and read the correct history', async () => {
    const bridge = syntheticPremiumBridge();
    const catalog = await readManualDeliveryCatalog(bridge.browserFetch);
    expect(catalog.map((p) => p.sku)).toEqual(['2XP', 'LUCK']);

    const xp = { requestId: xpRequestId, playerId, sku: '2XP', quantity: 2,
      reason: 'Pagamento 2XP conferido por canal externo.' };
    expect(await submitManualDelivery(xp, bridge.browserFetch))
      .toEqual({ status: 'applied', replayed: false, requestId: xpRequestId });
    expect(await submitManualDelivery(xp, bridge.browserFetch))
      .toEqual({ status: 'applied', replayed: true, requestId: xpRequestId });
    expect((await readManualDeliveryHistory(playerId, bridge.browserFetch)))
      .toMatchObject([{ sku: '2XP', quantity: 2, durationSeconds: 1209600 }]);

    const luck = { requestId: luckRequestId, playerId, sku: 'LUCK', quantity: 1,
      reason: 'Bênção verificada externamente pelo administrador.' };
    expect(await submitManualDelivery(luck, bridge.browserFetch))
      .toMatchObject({ status: 'applied', replayed: false });
    const second = { ...xp, requestId: secondRequestId };
    expect(await submitManualDelivery(second, bridge.browserFetch))
      .toMatchObject({ status: 'applied', replayed: false });
    const history = await readManualDeliveryHistory(playerId, bridge.browserFetch);
    expect(history).toHaveLength(3);
    expect(history.filter((entry) => entry.sku === '2XP')).toHaveLength(2);
    expect(history.find((entry) => entry.sku === 'LUCK'))
      .toMatchObject({ durationSeconds: null, entitlementKey: 'CAPTURE_LUCK_2X' });
    expect(bridge.entries).toHaveLength(3);
    expect(bridge.upstream.mock.calls.filter(([url]) =>
      url === api + '/v1/hub/admin/premium/delivery')).toHaveLength(4);
  });

  it('recovers an uncertain HTTP response by replaying the SAME request ID', async () => {
    const bridge = syntheticPremiumBridge();
    bridge.dropNextResponse();
    const input = { requestId: xpRequestId, playerId, sku: '2XP', quantity: 1,
      reason: 'Pagamento conferido fora do sistema por operador.' };
    expect(await submitManualDelivery(input, bridge.browserFetch))
      .toMatchObject({ status: 'unavailable' });
    expect(bridge.entries).toHaveLength(1);
    expect(await submitManualDelivery(input, bridge.browserFetch))
      .toMatchObject({ status: 'applied', replayed: true });
    expect(bridge.entries).toHaveLength(1);
    expect((await readManualDeliveryHistory(playerId, bridge.browserFetch))[0])
      .toMatchObject({ requestId: xpRequestId, quantity: 1 });
    expect(await submitManualDelivery({ ...input, quantity: 2 }, bridge.browserFetch))
      .toMatchObject({ status: 'conflict' });
    expect(bridge.entries).toHaveLength(1);
  });

  it('allows owner without delegation but rejects ordinary ADM and player before reaching grants', async () => {
    const bridge = syntheticPremiumBridge();
    bridge.actingAs('owner');
    expect(await readManualDeliveryCatalog(bridge.browserFetch)).toHaveLength(2);
    bridge.actingAs('ordinary-adm');
    const input = { requestId: xpRequestId, playerId, sku: '2XP', quantity: 1,
      reason: 'Este usuário não recebeu delegação Premium.' };
    expect(await submitManualDelivery(input, bridge.browserFetch))
      .toMatchObject({ status: 'forbidden' });
    bridge.actingAs('player');
    expect(await submitManualDelivery(input, bridge.browserFetch))
      .toMatchObject({ status: 'forbidden' });
    expect(bridge.entries).toHaveLength(0);
    expect(bridge.upstream.mock.calls.some(([url]) =>
      url === api + '/v1/hub/admin/premium/delivery')).toBe(false);
  });
});
