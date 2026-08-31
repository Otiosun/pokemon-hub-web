import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  AdminApiClient,
  AdminPrepareOperationRequest,
  AdminPrepareOperationResult,
  Player360Overview,
} from '../../lib/api/admin-api';
import {
  InventoryAdjustPrepareDrawer,
  prepareInventoryAdjustment,
} from './InventoryAdjustPrepareDrawer';

const PLAYER = {
  playerId: '11111111-1111-4111-8111-111111111111',
  profile: { trainerName: 'Red' },
  wallets: [],
  inventory: [
    {
      itemId: '22222222-2222-4222-8222-222222222222',
      slug: 'rare-candy',
      quantity: '12',
      revision: '4',
      updatedAt: '2026-08-31T12:00:00.000Z',
    },
  ],
} as unknown as Player360Overview;

describe('inventory.adjust prepare drawer', () => {
  it('uses only validated inventory targets and does not claim an apply result', () => {
    const client = {
      prepareOperation: async () => {
        throw new Error('not called during render');
      },
    } as Pick<AdminApiClient, 'prepareOperation'>;

    const html = renderToStaticMarkup(
      <InventoryAdjustPrepareDrawer client={client} onClose={() => undefined} player={PLAYER} />,
    );

    expect(html).toContain('PREPARAR CORREÇÃO DE INVENTÁRIO');
    expect(html).toContain('Red');
    expect(html).toContain('Rare Candy');
    expect(html).toContain('Quantidade atual: 12');
    expect(html).toContain('REV 4');
    expect(html).toContain('Delta de quantidade');
    expect(html).toContain('Motivo da intervenção');
    expect(html).toContain('inventory.adjust');
    expect(html).toContain('R2');
    expect(html).toContain('Preparar operação');
    expect(html).not.toContain('UUID do item');
    expect(html).not.toContain('expectedRevision');
    expect(html).not.toContain('Aplicar operação');
    expect(html).not.toContain('Simular operação');
    expect(html).not.toContain('JSON');
  });

  it('sends exactly player, item, delta, reason and idempotency key to prepareOperation', async () => {
    let captured: AdminPrepareOperationRequest | null = null;
    const fakeResult = {} as AdminPrepareOperationResult;
    const client = {
      prepareOperation: async (request: AdminPrepareOperationRequest) => {
        captured = request;
        return fakeResult;
      },
    } as Pick<AdminApiClient, 'prepareOperation'>;

    const result = await prepareInventoryAdjustment(client, {
      playerId: PLAYER.playerId,
      itemId: '22222222-2222-4222-8222-222222222222',
      delta: '-3',
      reason: 'Reversão de item duplicado.',
      idempotencyKey: 'inventory-adjust:33333333-3333-4333-8333-333333333333',
    });

    expect(result).toBe(fakeResult);
    expect(captured).toEqual({
      operationType: 'inventory.adjust',
      input: {
        playerId: '11111111-1111-4111-8111-111111111111',
        itemId: '22222222-2222-4222-8222-222222222222',
        delta: '-3',
      },
      reason: 'Reversão de item duplicado.',
      idempotencyKey: 'inventory-adjust:33333333-3333-4333-8333-333333333333',
    });
  });
});
