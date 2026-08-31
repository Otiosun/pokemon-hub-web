import { describe, expect, it } from 'vitest';
import { buildWalletAdjustPrepareRequest } from './wallet-adjust-prepare';

const PLAYER_ID = '10000000-0000-4000-8000-000000000001';
const CURRENCY_ID = '20000000-0000-4000-8000-000000000002';

function build(delta = '250') {
  return buildWalletAdjustPrepareRequest({
    playerId: PLAYER_ID,
    currencyId: CURRENCY_ID,
    delta,
    reason: 'Correção após auditoria de recompensa duplicada.',
    idempotencyKey: 'wallet-adjust:30000000-0000-4000-8000-000000000003',
  });
}

describe('wallet.adjust PREPARE-only contract', () => {
  it('produces only the Registry allowlisted payload', () => {
    expect(build()).toEqual({
      operationType: 'wallet.adjust',
      input: {
        playerId: PLAYER_ID,
        currencyId: CURRENCY_ID,
        delta: '250',
      },
      reason: 'Correção após auditoria de recompensa duplicada.',
      idempotencyKey: 'wallet-adjust:30000000-0000-4000-8000-000000000003',
    });
    expect(build()).not.toHaveProperty('expectedRevision');
  });

  it.each(['0', '1.5', '+2', '9223372036854775808', '-9223372036854775808'])(
    'rejects invalid delta %s',
    (delta) => expect(() => build(delta)).toThrow(),
  );

  it('accepts the signed PostgreSQL bigint boundary', () => {
    expect(build('9223372036854775807').input.delta).toBe('9223372036854775807');
    expect(build('-9223372036854775807').input.delta).toBe('-9223372036854775807');
  });

  it('requires a bounded human reason', () => {
    expect(() =>
      buildWalletAdjustPrepareRequest({
        playerId: PLAYER_ID,
        currencyId: CURRENCY_ID,
        delta: '5',
        reason: '   ',
        idempotencyKey: 'wallet-adjust:30000000-0000-4000-8000-000000000003',
      }),
    ).toThrow();
  });
});
