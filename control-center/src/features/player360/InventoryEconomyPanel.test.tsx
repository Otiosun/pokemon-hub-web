import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { InventoryEconomyPanel } from './InventoryEconomyPanel';

const PLAYER: Player360Overview = {
  playerId: '00000000-0000-4000-8000-000000000444',
  status: 'ACTIVE',
  createdAt: '2026-08-20T12:00:00.000Z',
  updatedAt: '2026-08-30T18:30:00.000Z',
  playerRevision: '14',
  profile: {
    trainerName: 'Lia',
    originRegionId: null,
    locale: 'pt-BR',
    revision: '3',
  },
  onboarding: {
    state: 'COMPLETED',
    completedAt: '2026-08-20T12:15:00.000Z',
    revision: '5',
    contentReleaseId: null,
    rulesetId: null,
  },
  progression: { level: 12, insigniaPoints: '420', revision: '9', unlocks: [] },
  location: { areaId: null, enteredAt: null, revision: null },
  identities: [],
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
    {
      itemId: '00000000-0000-4000-8000-000000000802',
      slug: 'full-restore',
      quantity: '4',
      revision: '3',
      updatedAt: '2026-08-29T12:00:00.000Z',
    },
  ],
  pokemon: [],
  pokedex: { speciesSeen: 0, speciesCaught: 0, entries: [] },
  activeEncounter: null,
  activeBattle: null,
  effects: [],
  recentActivity: [],
  unsupportedSections: ['COOLDOWNS', 'PUNISHMENTS_FLAGS'],
};

describe('Player 360 inventory + economy tab', () => {
  it('shows authoritative balances and item quantities without inventing valuation or mutations', () => {
    const html = renderToStaticMarkup(<InventoryEconomyPanel player={PLAYER} />);

    expect(html).toContain('ECONOMIA &amp; INVENTÁRIO');
    expect(html).toContain('SALDOS');
    expect(html).toContain('Poké Dólares');
    expect(html).toContain('12.500');
    expect(html).toContain('poke-dollars');
    expect(html).toContain('ITENS');
    expect(html).toContain('Ultra Ball');
    expect(html).toContain('32');
    expect(html).toContain('Full Restore');
    expect(html).toContain('REV 7');
    expect(html).not.toContain('Valor total');
    expect(html).not.toContain('Ajustar saldo');
    expect(html).not.toContain('Dar item');
    expect(html).not.toContain('Remover item');
  });

  it('keeps wallet and inventory empty states explicit', () => {
    const html = renderToStaticMarkup(
      <InventoryEconomyPanel player={{ ...PLAYER, wallets: [], inventory: [] }} />,
    );

    expect(html).toContain('Nenhuma wallet registrada.');
    expect(html).toContain('Nenhum item registrado.');
  });

  it('blocks malformed economy data instead of rendering unvalidated values', () => {
    const html = renderToStaticMarkup(
      <InventoryEconomyPanel
        player={{ ...PLAYER, inventory: [{ slug: 'ultra-ball', quantity: '-10' }] }}
      />,
    );

    expect(html).toContain('Dados econômicos incompatíveis com o contrato atual.');
    expect(html).not.toContain('-10');
  });
});
