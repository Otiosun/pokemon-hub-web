import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  AdminApiClient,
  AdminPrepareOperationRequest,
  AdminPrepareOperationResult,
  Player360Overview,
} from '../../lib/api/admin-api';
import { prepareWalletAdjustment, WalletAdjustPrepareDrawer } from './WalletAdjustPrepareDrawer';

const PLAYER = {
  playerId: '11111111-1111-4111-8111-111111111111',
  profile: { trainerName: 'Red' },
  wallets: [
    {
      currencyId: '22222222-2222-4222-8222-222222222222',
      slug: 'poke-dollar',
      displayName: 'Poké Dollar',
      amount: '12500',
      revision: '4',
      updatedAt: '2026-08-31T12:00:00.000Z',
    },
  ],
  inventory: [],
} as unknown as Player360Overview;

describe('wallet.adjust prepare drawer', () => {
  it('offers only validated Player 360 wallets and no manual currency id field', () => {
    const client = {
      prepareOperation: async () => {
        throw new Error('not called during render');
      },
    } as Pick<AdminApiClient, 'prepareOperation'>;

    const html = renderToStaticMarkup(
      <WalletAdjustPrepareDrawer client={client} onClose={() => undefined} player={PLAYER} />,
    );

    expect(html).toContain('PREPARAR CORREÇÃO DE SALDO');
    expect(html).toContain('Red');
    expect(html).toContain('Poké Dollar');
    expect(html).toContain('12.500');
    expect(html).toContain('R2');
    expect(html).toContain('Wallet');
    expect(html).toContain('Delta de saldo');
    expect(html).toContain('Motivo da intervenção');
    expect(html).toContain('Preparar operação');
    expect(html).not.toContain('ID da moeda');
    expect(html).not.toContain('expectedRevision');
    expect(html).not.toContain('Aplicar operação');
    expect(html).not.toContain('Simular operação');
    expect(html).not.toContain('JSON');
  });

  it('sends only the selected validated wallet target to prepareOperation', async () => {
    let captured: AdminPrepareOperationRequest | null = null;
    const fakeResult = {} as AdminPrepareOperationResult;
    const client = {
      prepareOperation: async (request: AdminPrepareOperationRequest) => {
        captured = request;
        return fakeResult;
      },
    } as Pick<AdminApiClient, 'prepareOperation'>;

    const result = await prepareWalletAdjustment(client, {
      playerId: PLAYER.playerId,
      currencyId: '22222222-2222-4222-8222-222222222222',
      delta: '-500',
      reason: 'Reversão de recompensa duplicada.',
      idempotencyKey: 'wallet-adjust:33333333-3333-4333-8333-333333333333',
    });

    expect(result).toBe(fakeResult);
    expect(captured).toEqual({
      operationType: 'wallet.adjust',
      input: {
        playerId: '11111111-1111-4111-8111-111111111111',
        currencyId: '22222222-2222-4222-8222-222222222222',
        delta: '-500',
      },
      reason: 'Reversão de recompensa duplicada.',
      idempotencyKey: 'wallet-adjust:33333333-3333-4333-8333-333333333333',
    });
  });
});
