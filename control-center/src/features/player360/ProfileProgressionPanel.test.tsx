import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { ProfileProgressionPanel } from './ProfileProgressionPanel';

const PLAYER: Player360Overview = {
  playerId: '00000000-0000-4000-8000-000000000444',
  status: 'ACTIVE',
  createdAt: '2026-08-20T12:00:00.000Z',
  updatedAt: '2026-08-30T18:30:00.000Z',
  playerRevision: '14',
  profile: {
    trainerName: 'Lia',
    originRegionId: '00000000-0000-4000-8000-000000000150',
    locale: 'pt-BR',
    revision: '3',
  },
  onboarding: {
    state: 'COMPLETED',
    completedAt: '2026-08-20T12:15:00.000Z',
    revision: '5',
    contentReleaseId: '00000000-0000-4000-8000-000000000501',
    rulesetId: '00000000-0000-4000-8000-000000000601',
  },
  progression: {
    level: 12,
    insigniaPoints: '420',
    revision: '9',
    unlocks: [
      {
        key: 'travel:kanto-route-2',
        status: 'ACTIVE',
        sourceType: 'TRAINER_LEVEL',
        sourceId: 'level:10',
        unlockedAt: '2026-08-25T09:00:00.000Z',
        revokedAt: null,
        revision: '2',
      },
      {
        key: 'event:legacy-pass',
        status: 'REVOKED',
        sourceType: 'EVENT',
        sourceId: 'legacy-2026',
        unlockedAt: '2026-08-21T09:00:00.000Z',
        revokedAt: '2026-08-22T09:00:00.000Z',
        revision: '4',
      },
    ],
  },
  location: { areaId: null, enteredAt: null, revision: null },
  identities: [],
  wallets: [],
  inventory: [],
  pokemon: [],
  pokedex: { speciesSeen: 0, speciesCaught: 0, entries: [] },
  activeEncounter: null,
  activeBattle: null,
  effects: [],
  recentActivity: [],
  unsupportedSections: ['COOLDOWNS', 'PUNISHMENTS_FLAGS'],
};

describe('Player 360 profile/progression tab', () => {
  it('renders real profile, onboarding, progression and unlock state without exposing mutations', () => {
    const html = renderToStaticMarkup(<ProfileProgressionPanel player={PLAYER} />);

    expect(html).toContain('PERFIL &amp; PROGRESSÃO');
    expect(html).toContain('Lia');
    expect(html).toContain('pt-BR');
    expect(html).toContain('COMPLETED');
    expect(html).toContain('Nível 12');
    expect(html).toContain('420 pontos de Insígnia');
    expect(html).toContain('travel:kanto-route-2');
    expect(html).toContain('TRAINER_LEVEL');
    expect(html).toContain('event:legacy-pass');
    expect(html).toContain('REVOKED');
    expect(html).not.toContain('Editar');
    expect(html).not.toContain('Salvar');
    expect(html).not.toContain('Aplicar');
  });

  it('keeps the unlock empty state explicit', () => {
    const html = renderToStaticMarkup(
      <ProfileProgressionPanel
        player={{ ...PLAYER, progression: { ...PLAYER.progression, unlocks: [] } }}
      />,
    );

    expect(html).toContain('Nenhum unlock registrado para este jogador.');
  });
});
