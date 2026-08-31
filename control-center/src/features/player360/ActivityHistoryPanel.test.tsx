import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { ActivityHistoryPanel } from './ActivityHistoryPanel';

const PLAYER = {
  recentActivity: [
    {
      kind: 'WALLET',
      occurredAt: '2026-08-30T21:00:00.000Z',
      subjectId: 'currency-pokedollar',
      sourceType: 'ADMIN_OPERATION',
      sourceId: 'operation-91',
      reason: 'Correção de saldo após suporte',
      correlationId: 'corr-91',
    },
    {
      kind: 'POKEMON_HISTORY',
      occurredAt: '2026-08-30T19:00:00.000Z',
      subjectId: 'pokemon-instance-8',
      sourceType: 'BATTLE',
      sourceId: 'battle-91',
      reason: null,
      correlationId: null,
    },
    {
      kind: 'TRAINER_PROGRESS',
      occurredAt: '2026-08-29T18:00:00.000Z',
      subjectId: null,
      sourceType: 'SYSTEM',
      sourceId: 'progression-engine',
      reason: null,
      correlationId: 'corr-progress-8',
    },
  ],
} as unknown as Player360Overview;

describe('Player 360 activity history tab', () => {
  it('shows the canonical audit-oriented timeline newest first without mutation shortcuts', () => {
    const html = renderToStaticMarkup(<ActivityHistoryPanel player={PLAYER} />);

    expect(html).toContain('ATIVIDADE &amp; HISTÓRICO');
    expect(html).toContain('WALLET');
    expect(html).toContain('POKÉMON');
    expect(html).toContain('PROGRESSÃO');
    expect(html).toContain('Correção de saldo após suporte');
    expect(html).toContain('ADMIN_OPERATION');
    expect(html).toContain('operation-91');
    expect(html).toContain('corr-91');
    expect(html).toContain('pokemon-instance-8');
    expect(html.indexOf('2026-08-30T21:00:00.000Z')).toBeLessThan(
      html.indexOf('2026-08-30T19:00:00.000Z'),
    );
    expect(html).not.toContain('Reverter');
    expect(html).not.toContain('Repetir operação');
    expect(html).not.toContain('Compensar');
  });

  it('keeps an explicit empty activity state', () => {
    const html = renderToStaticMarkup(
      <ActivityHistoryPanel player={{ ...PLAYER, recentActivity: [] }} />,
    );

    expect(html).toContain('Nenhuma atividade recente registrada.');
  });
});
