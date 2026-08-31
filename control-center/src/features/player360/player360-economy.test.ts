import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { parsePlayer360Economy } from './player360-economy';

const BASE_PLAYER = {
  wallets: [],
  inventory: [],
} as unknown as Player360Overview;

describe('Player 360 economy boundary', () => {
  it('accepts canonical wallet and inventory records', () => {
    const result = parsePlayer360Economy({
      ...BASE_PLAYER,
      wallets: [
        {
          currencyId: '00000000-0000-4000-8000-000000000701',
          slug: 'poke-dollars',
          displayName: 'Poké Dólares',
          amount: '12500',
          revision: '6',
          updatedAt: '2026-08-30T14:00:00.000Z',
        },
      ],
      inventory: [
        {
          itemId: '00000000-0000-4000-8000-000000000801',
          slug: 'ultra-ball',
          quantity: '32',
          revision: '7',
          updatedAt: '2026-08-30T15:00:00.000Z',
        },
      ],
    });

    expect(result.wallets[0]?.amount).toBe('12500');
    expect(result.inventory[0]?.quantity).toBe('32');
  });

  it('fails closed for malformed economic data', () => {
    expect(() =>
      parsePlayer360Economy({
        ...BASE_PLAYER,
        wallets: [{ slug: 'poke-dollars', amount: '12500' }],
      }),
    ).toThrow('Invalid Player 360 wallet.');

    expect(() =>
      parsePlayer360Economy({
        ...BASE_PLAYER,
        inventory: [
          {
            itemId: '00000000-0000-4000-8000-000000000801',
            slug: 'ultra-ball',
            quantity: '-1',
            revision: '7',
            updatedAt: '2026-08-30T15:00:00.000Z',
          },
        ],
      }),
    ).toThrow('Invalid Player 360 inventory item.');
  });
});
