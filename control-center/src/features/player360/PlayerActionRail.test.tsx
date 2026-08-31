import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { PlayerActionRail } from './PlayerActionRail';

const PLAYER = {
  activeBattle: { id: 'battle-live' },
  activeEncounter: null,
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
  inventory: [
    {
      itemId: '33333333-3333-4333-8333-333333333333',
      slug: 'rare-candy',
      quantity: '12',
      revision: '7',
      updatedAt: '2026-08-31T12:00:00.000Z',
    },
  ],
} as unknown as Player360Overview;

describe('Player 360 action rail surface', () => {
  it('renders only contextual Registry actions while execution remains closed', () => {
    const html = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['wallet.adjust', 'battle.force_cancel', 'encounter.force_close'])}
        player={PLAYER}
      />,
    );

    expect(html).toContain('AÇÕES CONTEXTUAIS');
    expect(html).toContain('Corrigir saldo');
    expect(html).toContain('Cancelar batalha');
    expect(html).not.toContain('Fechar encounter');
    expect(html).toContain('R2');
    expect(html).toContain('R3');
    expect(html).toContain('EXECUÇÃO AINDA BLOQUEADA');
    expect(html).not.toContain('Aplicar agora');
    expect(html).not.toContain('F4.12');
    expect(html).not.toContain('SQL');
    expect(html).not.toContain('JSON');
  });

  it('exposes an actionable prepare-only entry for battle force-cancel without claiming execution', () => {
    const html = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['battle.force_cancel'])}
        onPrepareAction={() => undefined}
        player={PLAYER}
      />,
    );

    expect(html).toContain('PREPARAR OPERAÇÃO');
    expect(html).toContain('Preparar cancelamento');
    expect(html).toContain('battle.force_cancel');
    expect(html).toContain('player-action-prepare');
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('Aplicar cancelamento');
    expect(html).not.toContain('Executar cancelamento');
  });

  it('exposes progression adjustment as prepare-only when the exact capability exists', () => {
    const html = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['progression.adjust'])}
        onPrepareAction={() => undefined}
        player={PLAYER}
      />,
    );

    expect(html).toContain('Corrigir progressão');
    expect(html).toContain('progression.trainer.adjust');
    expect(html).toContain('Preparar ajuste');
    expect(html).toContain('R2');
    expect(html).not.toContain('REVISÃO OBRIGATÓRIA');
    expect(html).not.toContain('CONFIRMAÇÃO OBRIGATÓRIA');
    expect(html).not.toContain('Aplicar ajuste');
  });

  it('exposes wallet adjustment only when capability and a validated wallet target both exist', () => {
    const actionable = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['wallet.adjust'])}
        onPrepareAction={() => undefined}
        player={PLAYER}
      />,
    );
    const withoutWallet = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['wallet.adjust'])}
        onPrepareAction={() => undefined}
        player={{ ...PLAYER, wallets: [] }}
      />,
    );
    const invalidWallet = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['wallet.adjust'])}
        onPrepareAction={() => undefined}
        player={{ ...PLAYER, wallets: [{ currencyId: 'manual-id' }] }}
      />,
    );

    expect(actionable).toContain('Corrigir saldo');
    expect(actionable).toContain('wallet.adjust');
    expect(actionable).toContain('Preparar ajuste');
    expect(withoutWallet).not.toContain('Corrigir saldo');
    expect(invalidWallet).not.toContain('Corrigir saldo');
  });

  it('exposes inventory adjustment only when capability and a validated item target both exist', () => {
    const actionable = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['inventory.adjust'])}
        onPrepareAction={() => undefined}
        player={PLAYER}
      />,
    );
    const withoutInventory = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['inventory.adjust'])}
        onPrepareAction={() => undefined}
        player={{ ...PLAYER, inventory: [] }}
      />,
    );
    const invalidInventory = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['inventory.adjust'])}
        onPrepareAction={() => undefined}
        player={{ ...PLAYER, inventory: [{ itemId: 'manual-id' }] }}
      />,
    );

    expect(actionable).toContain('Corrigir inventário');
    expect(actionable).toContain('inventory.adjust');
    expect(actionable).toContain('Preparar ajuste');
    expect(withoutInventory).not.toContain('Corrigir inventário');
    expect(invalidInventory).not.toContain('Corrigir inventário');
  });

  it('shows a stable no-action state instead of leaking unavailable privileges', () => {
    const html = renderToStaticMarkup(
      <PlayerActionRail capabilities={new Set()} player={PLAYER} />,
    );

    expect(html).toContain('Nenhuma ação administrativa disponível neste contexto.');
    expect(html).not.toContain('wallet.adjust');
    expect(html).not.toContain('battle.force_cancel');
  });
});
