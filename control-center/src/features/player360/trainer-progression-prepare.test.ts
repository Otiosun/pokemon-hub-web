import { describe, expect, it } from 'vitest';
import { buildTrainerProgressionPrepareRequest } from './trainer-progression-prepare';

describe('trainer progression prepare-only request', () => {
  it('builds the exact Registry payload without inventing level or expectedRevision', () => {
    expect(
      buildTrainerProgressionPrepareRequest({
        playerId: '11111111-1111-4111-8111-111111111111',
        delta: '250',
        reason: '  Correção de recompensa registrada no suporte.  ',
        idempotencyKey: 'progression-adjust:22222222-2222-4222-8222-222222222222',
      }),
    ).toEqual({
      operationType: 'progression.trainer.adjust',
      input: {
        playerId: '11111111-1111-4111-8111-111111111111',
        delta: '250',
      },
      reason: 'Correção de recompensa registrada no suporte.',
      idempotencyKey: 'progression-adjust:22222222-2222-4222-8222-222222222222',
    });
  });

  it('rejects zero, decimals and unsafe deltas before reaching HTTP', () => {
    const base = {
      playerId: '11111111-1111-4111-8111-111111111111',
      reason: 'Correção administrativa.',
      idempotencyKey: 'progression-adjust:22222222-2222-4222-8222-222222222222',
    } as const;

    expect(() => buildTrainerProgressionPrepareRequest({ ...base, delta: '0' })).toThrow();
    expect(() => buildTrainerProgressionPrepareRequest({ ...base, delta: '1.5' })).toThrow();
    expect(() =>
      buildTrainerProgressionPrepareRequest({ ...base, delta: '9007199254740992' }),
    ).toThrow();
  });
});
