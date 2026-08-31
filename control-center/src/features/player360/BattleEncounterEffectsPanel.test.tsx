import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { BattleEncounterEffectsPanel } from './BattleEncounterEffectsPanel';

const PLAYER = {
  activeEncounter: {
    id: 'encounter-42',
    status: 'ACTIVE',
    areaId: 'area-route-1',
    contentReleaseId: 'release-7',
    rulesetId: 'ruleset-default',
    createdAt: '2026-08-30T20:00:00.000Z',
    updatedAt: '2026-08-30T20:05:00.000Z',
  },
  activeBattle: {
    id: 'battle-91',
    status: 'IN_PROGRESS',
    battleType: 'PVE',
    encounterId: 'encounter-42',
    contentReleaseId: 'release-7',
    rulesetId: 'ruleset-default',
    turnNumber: 6,
    version: '11',
    createdAt: '2026-08-30T20:01:00.000Z',
    updatedAt: '2026-08-30T20:06:00.000Z',
    endedAt: null,
  },
  effects: [
    {
      id: 'effect-instance-1',
      effectId: 'effect-poison',
      effectSlug: 'poisoned',
      contentReleaseId: 'release-7',
      playerId: null,
      pokemonInstanceId: 'pokemon-instance-8',
    },
  ],
} as unknown as Player360Overview;

describe('Player 360 encounter battle effects tab', () => {
  it('prioritizes active battle while keeping encounter and effects diagnostic-only', () => {
    const html = renderToStaticMarkup(<BattleEncounterEffectsPanel player={PLAYER} />);

    expect(html).toContain('COMBATE &amp; ENCOUNTER');
    expect(html).toContain('BATALHA ATIVA');
    expect(html).toContain('battle-91');
    expect(html).toContain('IN_PROGRESS');
    expect(html).toContain('PVE');
    expect(html).toContain('TURNO 6');
    expect(html).toContain('ENCOUNTER ATIVO');
    expect(html).toContain('encounter-42');
    expect(html).toContain('area-route-1');
    expect(html).toContain('EFEITOS ATIVOS');
    expect(html).toContain('Poisoned');
    expect(html).toContain('pokemon-instance-8');
    expect(html).not.toContain('Encerrar batalha');
    expect(html).not.toContain('Fechar encounter');
    expect(html).not.toContain('Remover efeito');
  });

  it('keeps all three empty states explicit', () => {
    const html = renderToStaticMarkup(
      <BattleEncounterEffectsPanel
        player={{ ...PLAYER, activeEncounter: null, activeBattle: null, effects: [] }}
      />,
    );

    expect(html).toContain('Sem batalha ativa.');
    expect(html).toContain('Sem encounter ativo.');
    expect(html).toContain('Sem efeitos ativos.');
  });
});
