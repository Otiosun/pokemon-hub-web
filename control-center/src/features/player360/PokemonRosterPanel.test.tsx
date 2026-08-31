import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { PokemonRosterPanel } from './PokemonRosterPanel';

const BASE_PLAYER: Player360Overview = {
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
  wallets: [],
  inventory: [],
  pokemon: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      formId: '00000000-0000-4000-8000-000000000101',
      formSlug: 'pikachu',
      speciesId: '00000000-0000-4000-8000-000000000201',
      speciesSlug: 'pikachu',
      nationalDex: 25,
      nickname: 'Volt',
      level: 18,
      xp: '6200',
      currentHp: 41,
      gender: 'MALE',
      shiny: false,
      status: 'ACTIVE',
      abilityId: '00000000-0000-4000-8000-000000000301',
      abilitySlug: 'static',
      natureId: '00000000-0000-4000-8000-000000000401',
      natureSlug: 'jolly',
      revision: '7',
      createdAt: '2026-08-20T12:30:00.000Z',
      updatedAt: '2026-08-30T12:30:00.000Z',
      placement: { kind: 'TEAM', boxNo: null, slotNo: 1 },
      ivs: { hp: 31, attack: 21, defense: 18, spAttack: 17, spDefense: 22, speed: 30 },
      moves: [
        {
          slotNo: 1,
          moveId: '00000000-0000-4000-8000-000000000501',
          slug: 'thunder-shock',
          ppCurrent: 27,
          learnedAt: '2026-08-21T12:30:00.000Z',
        },
      ],
      persistentConditions: [
        {
          key: 'status:poison',
          sourceType: 'BATTLE',
          sourceId: 'battle:42',
          appliedAt: '2026-08-30T11:00:00.000Z',
          expiresAt: null,
        },
      ],
      evolutionConditionFlags: [],
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      formId: '00000000-0000-4000-8000-000000000102',
      formSlug: 'bulbasaur',
      speciesId: '00000000-0000-4000-8000-000000000202',
      speciesSlug: 'bulbasaur',
      nationalDex: 1,
      nickname: null,
      level: 12,
      xp: '2800',
      currentHp: 32,
      gender: 'FEMALE',
      shiny: true,
      status: 'ACTIVE',
      abilityId: null,
      abilitySlug: null,
      natureId: null,
      natureSlug: null,
      revision: '4',
      createdAt: '2026-08-22T12:30:00.000Z',
      updatedAt: '2026-08-29T12:30:00.000Z',
      placement: { kind: 'BOX', boxNo: 2, slotNo: 3 },
      ivs: { hp: null, attack: null, defense: null, spAttack: null, spDefense: null, speed: null },
      moves: [],
      persistentConditions: [],
      evolutionConditionFlags: [
        {
          key: 'evolution:friendship',
          status: 'ACTIVE',
          sourceType: 'SYSTEM',
          sourceId: 'friendship:high',
          grantedAt: '2026-08-29T10:00:00.000Z',
          revokedAt: null,
          revision: '1',
        },
      ],
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      formId: '00000000-0000-4000-8000-000000000103',
      formSlug: 'pidgey',
      speciesId: '00000000-0000-4000-8000-000000000203',
      speciesSlug: 'pidgey',
      nationalDex: 16,
      nickname: null,
      level: 7,
      xp: '900',
      currentHp: 18,
      gender: null,
      shiny: false,
      status: 'ARCHIVED',
      abilityId: null,
      abilitySlug: null,
      natureId: null,
      natureSlug: null,
      revision: '8',
      createdAt: '2026-08-20T15:00:00.000Z',
      updatedAt: '2026-08-30T08:00:00.000Z',
      placement: null,
      ivs: { hp: 12, attack: 12, defense: 12, spAttack: 12, spDefense: 12, speed: 12 },
      moves: [],
      persistentConditions: [],
      evolutionConditionFlags: [],
    },
  ],
  pokedex: { speciesSeen: 3, speciesCaught: 3, entries: [] },
  activeEncounter: null,
  activeBattle: null,
  effects: [],
  recentActivity: [],
  unsupportedSections: ['COOLDOWNS', 'PUNISHMENTS_FLAGS'],
};

describe('Player 360 Team + Box + Pokemon tab', () => {
  it('groups roster state by Team, Box and unplaced/archive without exposing mutations', () => {
    const html = renderToStaticMarkup(<PokemonRosterPanel player={BASE_PLAYER} />);

    expect(html).toContain('TIME &amp; BOX');
    expect(html).toContain('TIME ATUAL');
    expect(html).toContain('BOX 2');
    expect(html).toContain('FORA DO ROSTER');
    expect(html).toContain('Volt');
    expect(html).toContain('#025');
    expect(html).toContain('Pikachu');
    expect(html).toContain('Nv. 18');
    expect(html).toContain('HP atual 41');
    expect(html).toContain('Static');
    expect(html).toContain('Jolly');
    expect(html).toContain('Thunder Shock');
    expect(html).toContain('PP atual 27');
    expect(html).toContain('status:poison');
    expect(html).toContain('SHINY');
    expect(html).toContain('evolution:friendship');
    expect(html).toContain('ARCHIVED');
    expect(html).not.toContain('Mover Pokémon');
    expect(html).not.toContain('Editar Pokémon');
    expect(html).not.toContain('Arquivar Pokémon');
    expect(html).not.toContain('Restaurar Pokémon');
  });

  it('keeps an explicit empty roster state', () => {
    const html = renderToStaticMarkup(
      <PokemonRosterPanel player={{ ...BASE_PLAYER, pokemon: [] }} />,
    );
    expect(html).toContain('Nenhum Pokémon registrado para este jogador.');
  });
});
