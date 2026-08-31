import { describe, expect, it } from 'vitest';
import { buildInventoryAdjustPrepareRequest } from './inventory-adjust-prepare';

describe('inventory.adjust prepare contract', () => {
  it('serializes only the Registry allowlist while preserving bigint delta as string', () => {
    expect(
      buildInventoryAdjustPrepareRequest({
        playerId: '11111111-1111-4111-8111-111111111111',
        itemId: '22222222-2222-4222-8222-222222222222',
        delta: '-9007199254740993',
        reason: 'Reversão de item duplicado por incidente confirmado.',
        idempotencyKey: 'inventory-adjust:33333333-3333-4333-8333-333333333333',
      }),
    ).toEqual({
      operationType: 'inventory.adjust',
      input: {
        playerId: '11111111-1111-4111-8111-111111111111',
        itemId: '22222222-2222-4222-8222-222222222222',
        delta: '-9007199254740993',
      },
      reason: 'Reversão de item duplicado por incidente confirmado.',
      idempotencyKey: 'inventory-adjust:33333333-3333-4333-8333-333333333333',
    });
  });

  it('rejects zero, malformed targets and values outside PostgreSQL bigint', () => {
    const base = {
      playerId: '11111111-1111-4111-8111-111111111111',
      itemId: '22222222-2222-4222-8222-222222222222',
      delta: '5',
      reason: 'Correção administrativa documentada.',
      idempotencyKey: 'inventory-adjust:33333333-3333-4333-8333-333333333333',
    };

    expect(() => buildInventoryAdjustPrepareRequest({ ...base, delta: '0' })).toThrow();
    expect(() => buildInventoryAdjustPrepareRequest({ ...base, itemId: 'manual-slug' })).toThrow();
    expect(() =>
      buildInventoryAdjustPrepareRequest({ ...base, delta: '9223372036854775808' }),
    ).toThrow();
  });
});
