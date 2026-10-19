import { describe, expect, it, vi } from 'vitest';
import {
  addPremiumSupportEvent,
  getPremiumSupportEvents,
} from './playerPortalAdminPremiumSupportClient';

const playerId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333';
const event = {
  id: eventId,
  playerId,
  orderId: null,
  actorPrincipalId: actor,
  kind: 'NOTE',
  body: 'Conferido o histórico do jogador com cuidado.',
  createdAt: '2026-10-18T03:00:00.000Z',
};

describe('owner Premium support client', () => {
  it('loads official support history with authenticated, uncached GET', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ events: [event] }), { status: 200 }));
    expect(await getPremiumSupportEvents(playerId, fetcher)).toEqual({ status: 'ok', events: [event] });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(`/api/hub/admin/premium?playerId=${playerId}&resource=support`);
    expect(init).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store' });
  });

  it('sends no player spoofing, actor identifier, or payment directives in support note', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ event, replayed: false }), { status: 201 }));
    const draft = {
      eventId,
      kind: 'NOTE' as const,
      orderId: null,
      body: 'Conferido o histórico do jogador com cuidado.',
    };
    const result = await addPremiumSupportEvent(playerId, draft, fetcher);
    expect(result).toMatchObject({ status: 'saved', replayed: false });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toContain('resource=support');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(draft);
    expect(init?.credentials).toBe('include');
  });

  it('rejects forged or invalid support responses', async () => {
    const forged = vi.fn(async () => new Response(JSON.stringify({
      event: { ...event, playerId: '44444444-4444-4444-8444-444444444444' },
      replayed: false,
    }), { status: 201 }));
    await expect(addPremiumSupportEvent(playerId, {
      eventId, orderId: null, kind: 'NOTE', body: event.body,
    }, forged)).rejects.toThrow('inválido');
  });

  it('shows backend-unavailable, forbidden, and conflict states without inventing entries', async () => {
    const unavailable = vi.fn(async () => new Response(null, { status: 503 }));
    const denied = vi.fn(async () => new Response(null, { status: 403 }));
    const conflict = vi.fn(async () => new Response(null, { status: 409 }));
    expect(await getPremiumSupportEvents(playerId, unavailable)).toEqual({ status: 'unavailable' });
    expect(await getPremiumSupportEvents(playerId, denied)).toEqual({ status: 'forbidden' });
    expect(await addPremiumSupportEvent(playerId, {
      eventId, orderId: null, kind: 'REVIEW', body: event.body,
    }, conflict)).toEqual({ status: 'conflict' });
  });
});
