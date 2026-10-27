import { describe, expect, it, vi } from 'vitest';
import { deliverSinglePokemon, readDeliveryPokemonForms } from './manualPremiumPokemonClient';

const requestId = '11111111-1111-4111-8111-111111111111';
const playerId = '22222222-2222-4222-8222-222222222222';
const formId = '33333333-3333-4333-8333-333333333333';
const operationId = '44444444-4444-4444-8444-444444444444';
const input = {
  requestId,
  playerId,
  formId,
  level: 25,
  shiny: false,
  reason: 'Pokémon individual concedido depois de atendimento humano.',
};

describe('individual Pokémon delivery without payment', () => {
  it('reads only forms published by the staging backend', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            forms: [
              { formId, speciesSlug: 'pikachu', formSlug: 'default', displayName: 'Pikachu' },
            ],
          }),
          { status: 200 },
        ),
    );
    expect(await readDeliveryPokemonForms(fetcher)).toHaveLength(1);
    expect(fetcher.mock.calls[0]![0]).toBe('/api/hub/admin/premium/delivery/pokemon');
  });
  it('creates exactly one Pokémon through a request without payment details', async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ ...input, applied: true, replayed: false, operationId }), {
          status: 201,
        }),
    );
    expect(await deliverSinglePokemon(input, fetcher)).toEqual({
      kind: 'APPLIED',
      replayed: false,
      operationId,
    });
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe('/api/hub/admin/premium/delivery/pokemon');
    expect(options?.credentials).toBe('include');
    expect(JSON.parse(String(options?.body))).toEqual(input);
    expect(String(options?.body)).not.toMatch(/paid|payment|amountCents|orderId/);
  });
  it('does not claim rejected or unauthorized Pokémon were delivered', async () => {
    for (const [status, code] of [
      [401, 'UNAUTHORIZED'],
      [403, 'FORBIDDEN'],
      [404, 'UNAVAILABLE'],
      [503, 'UNAVAILABLE'],
      [409, 'REJECTED'],
    ] as const) {
      const fetcher = vi.fn(async () => new Response(null, { status }));
      expect(await deliverSinglePokemon(input, fetcher)).toEqual({ kind: 'ERROR', code });
    }
  });
  it('rejects invalid form, level and reason locally without network calls', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    await expect(deliverSinglePokemon({ ...input, formId: 'bad' }, fetcher)).rejects.toThrow();
    await expect(deliverSinglePokemon({ ...input, level: 101 }, fetcher)).rejects.toThrow();
    await expect(deliverSinglePokemon({ ...input, reason: '' }, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
