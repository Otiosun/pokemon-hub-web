import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  AdminApiClient,
  AdminPrepareOperationRequest,
  AdminPrepareOperationResult,
  Player360Overview,
} from '../../lib/api/admin-api';
import {
  BattleForceCancelPrepareDrawer,
  prepareBattleForceCancel,
} from './BattleForceCancelPrepareDrawer';

const PLAYER = {
  playerId: '11111111-1111-4111-8111-111111111111',
  profile: { trainerName: 'Red' },
  activeBattle: {
    id: '22222222-2222-4222-8222-222222222222',
    status: 'IN_PROGRESS',
    battleType: 'PVE',
    encounterId: null,
    contentReleaseId: 'release-7',
    rulesetId: 'ruleset-default',
    turnNumber: 6,
    version: '11',
    createdAt: '2026-08-31T10:00:00.000Z',
    updatedAt: '2026-08-31T10:05:00.000Z',
    endedAt: null,
  },
  activeEncounter: null,
  effects: [],
} as unknown as Player360Overview;

describe('battle.force_cancel prepare drawer', () => {
  it('shows target, concurrency token and risk without exposing apply lifecycle', () => {
    const client = {
      prepareOperation: async () => {
        throw new Error('not called during render');
      },
    } as Pick<AdminApiClient, 'prepareOperation'>;

    const html = renderToStaticMarkup(
      <BattleForceCancelPrepareDrawer client={client} onClose={() => undefined} player={PLAYER} />,
    );

    expect(html).toContain('PREPARAR CANCELAMENTO');
    expect(html).toContain('Red');
    expect(html).toContain('22222222-2222-4222-8222-222222222222');
    expect(html).toContain('REVISÃO 11');
    expect(html).toContain('R3');
    expect(html).toContain('Motivo da intervenção');
    expect(html).toContain('Preparar operação');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('Aplicar operação');
    expect(html).not.toContain('Simular operação');
    expect(html).not.toContain('JSON');
  });

  it('sends only the allowlisted prepare payload to AdminApiClient', async () => {
    let captured: AdminPrepareOperationRequest | null = null;
    const fakeResult = {} as AdminPrepareOperationResult;
    const client = {
      prepareOperation: async (request: AdminPrepareOperationRequest) => {
        captured = request;
        return fakeResult;
      },
    } as Pick<AdminApiClient, 'prepareOperation'>;

    const result = await prepareBattleForceCancel(client, {
      playerId: PLAYER.playerId,
      battleId: '22222222-2222-4222-8222-222222222222',
      battleVersion: '11',
      reason: 'Batalha travada após falha operacional.',
      idempotencyKey: 'battle-cancel:33333333-3333-4333-8333-333333333333',
    });

    expect(result).toBe(fakeResult);
    expect(captured).toEqual({
      operationType: 'battle.force_cancel',
      input: {
        playerId: '11111111-1111-4111-8111-111111111111',
        battleId: '22222222-2222-4222-8222-222222222222',
      },
      reason: 'Batalha travada após falha operacional.',
      expectedRevision: '11',
      idempotencyKey: 'battle-cancel:33333333-3333-4333-8333-333333333333',
    });
  });
});
