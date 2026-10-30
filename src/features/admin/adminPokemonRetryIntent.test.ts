import { describe, expect, it } from 'vitest';
import { keepPokemonAdminIntent } from './adminPokemonRetryIntent';

const first = {
  requestId: '11111111-1111-4111-8111-111111111111',
  operationType: 'pokemon.create',
  input: {
    playerId: '22222222-2222-4222-8222-222222222222',
    formId: '33333333-3333-4333-8333-333333333333',
    level: 5,
  },
  reason: 'Entrega manual aprovada e auditada.',
};

describe('Pokémon admin retry intent', () => {
  it('preserves the original request ID when a delivery loses its HTTP response', () => {
    const initial = keepPokemonAdminIntent(null, first);
    expect(initial.status).toBe('ready');
    if (initial.status !== 'ready') throw Error('Unexpected result');
    const attemptedRetry = { ...first, requestId: '44444444-4444-4444-8444-444444444444' };
    const retried = keepPokemonAdminIntent(initial.intent, attemptedRetry);
    expect(retried).toEqual(initial);
  });

  it('locks changes in level, recipient, reason, effect or operation type after an uncertain result', () => {
    const firstResult = keepPokemonAdminIntent(null, first);
    if (firstResult.status !== 'ready') throw Error('Unexpected result');
    const mutations = [
      { ...first, input: { ...first.input, level: 6 } },
      { ...first, input: { ...first.input, playerId: '55555555-5555-4555-8555-555555555555' } },
      { ...first, reason: 'Outros valores não confirmados.' },
      { ...first, operationType: 'pokemon.effect.apply' },
    ];
    for (const mutation of mutations) {
      expect(keepPokemonAdminIntent(firstResult.intent, mutation))
        .toEqual({ status: 'locked' });
    }
  });

  it('allows a new request only after the previous operation is definitively reconciled', () => {
    const old = keepPokemonAdminIntent(null, first);
    expect(old.status).toBe('ready');
    const next = keepPokemonAdminIntent(null, { ...first,
      requestId: '66666666-6666-4666-8666-666666666666',
    });
    expect(next.status).toBe('ready');
    if (next.status === 'ready') expect(next.intent.request.requestId).not.toBe(first.requestId);
  });
});
