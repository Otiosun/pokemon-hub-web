import { describe, expect, it, vi } from 'vitest';
import {
  openManualCase,
  updateManualCase,
  readPlayerCases,
  readCaseCatalog,
  readCaseEvents,
} from './manualPremiumCasesClient';

const id = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const playerId = '33333333-3333-4333-8333-333333333333';
const owner = '44444444-4444-4444-8444-444444444444';
const c = {
  id,
  playerId,
  sku: 'GEN',
  title: 'Pokémon Gênesis',
  quantity: 1,
  state: 'OPEN',
  revision: 0,
  openingActorPrincipalId: owner,
  createdAt: '2026-10-19T14:00:00Z',
  updatedAt: '2026-10-19T14:00:00Z',
};

describe('manual commercial cases are not payments or actual benefit grants', () => {
  it('opens only a case with a stable event ID and no monetary fields', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ case: c, replayed: false }), { status: 201 }),
    );
    const input = {
      caseId: id,
      eventId,
      playerId,
      sku: 'GEN',
      quantity: 1,
      note: 'Analisar conceito de espécie original apresentado pelo jogador.',
    };
    expect(await openManualCase(input, fetcher)).toMatchObject({ case: c, replayed: false });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('/api/hub/admin/premium/delivery/cases');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual(input);
    expect(String(init?.body)).not.toMatch(/amountCents|paid|paymentStatus|orderId/);
  });
  it('requires explicit attestation to close; a CLOSED case is not a granted entitlement', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({ case: { ...c, state: 'CLOSED', revision: 1 }, replayed: false }),
          { status: 200 },
        ),
    );
    await expect(
      updateManualCase(
        {
          caseId: id,
          eventId,
          expectedRevision: 0,
          nextState: 'CLOSED',
          note: 'Tudo terminado com comprovação humana.',
          attested: false,
        },
        fetcher,
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      (
        await updateManualCase(
          {
            caseId: id,
            eventId,
            expectedRevision: 0,
            nextState: 'CLOSED',
            note: 'Tudo terminado com comprovação humana.',
            attested: true,
          },
          fetcher,
        )
      ).case.state,
    ).toBe('CLOSED');
    const payload = String(fetcher.mock.calls[0]![1]?.body);
    expect(payload).toContain('"attested":true');
    expect(payload).not.toContain('"paid"');
  });
  it('validates server catalog, case list and immutable timeline', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
      const s = String(url);
      const body = s.endsWith('/catalog')
        ? { products: [{ sku: 'GEN', title: 'Gênesis', maxQuantity: 20 }] }
        : s.endsWith('/events')
          ? {
              events: [
                {
                  id: eventId,
                  caseId: id,
                  actorPrincipalId: owner,
                  nextState: 'OPEN',
                  note: 'Conceito do jogador em análise.',
                  createdAt: '2026-10-19T14:00:00Z',
                },
              ],
            }
          : { cases: [c] };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    expect(await readCaseCatalog(fetcher)).toHaveLength(1);
    expect((await readPlayerCases(playerId, fetcher))[0]?.id).toBe(id);
    expect((await readCaseEvents(id, fetcher))[0]?.nextState).toBe('OPEN');
    await expect(readPlayerCases('fake', fetcher)).rejects.toThrow();
  });
});
