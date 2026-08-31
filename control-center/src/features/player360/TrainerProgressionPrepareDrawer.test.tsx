import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  AdminApiClient,
  AdminPrepareOperationRequest,
  AdminPrepareOperationResult,
  Player360Overview,
} from '../../lib/api/admin-api';
import {
  prepareTrainerProgression,
  TrainerProgressionPrepareDrawer,
} from './TrainerProgressionPrepareDrawer';

const PLAYER = {
  playerId: '11111111-1111-4111-8111-111111111111',
  profile: { trainerName: 'Red' },
  progression: {
    level: 12,
    insigniaPoints: '3400',
    revision: '9',
    unlocks: [],
  },
} as unknown as Player360Overview;

describe('progression.trainer.adjust prepare drawer', () => {
  it('explains point delta semantics without exposing level override or apply lifecycle', () => {
    const client = {
      prepareOperation: async () => {
        throw new Error('not called during render');
      },
    } as Pick<AdminApiClient, 'prepareOperation'>;

    const html = renderToStaticMarkup(
      <TrainerProgressionPrepareDrawer client={client} onClose={() => undefined} player={PLAYER} />,
    );

    expect(html).toContain('PREPARAR AJUSTE DE PROGRESSÃO');
    expect(html).toContain('Red');
    expect(html).toContain('Nível 12');
    expect(html).toContain('3400 pontos');
    expect(html).toContain('R2');
    expect(html).toContain('Delta de pontos');
    expect(html).toContain('Motivo da intervenção');
    expect(html).toContain('Preparar operação');
    expect(html).not.toContain('Definir nível');
    expect(html).not.toContain('expectedRevision');
    expect(html).not.toContain('Aplicar operação');
    expect(html).not.toContain('Simular operação');
    expect(html).not.toContain('JSON');
  });

  it('sends only player, delta, reason and idempotency key to prepareOperation', async () => {
    let captured: AdminPrepareOperationRequest | null = null;
    const fakeResult = {} as AdminPrepareOperationResult;
    const client = {
      prepareOperation: async (request: AdminPrepareOperationRequest) => {
        captured = request;
        return fakeResult;
      },
    } as Pick<AdminApiClient, 'prepareOperation'>;

    const result = await prepareTrainerProgression(client, {
      playerId: PLAYER.playerId,
      delta: '-200',
      reason: 'Reversão de pontos duplicados.',
      idempotencyKey: 'progression-adjust:33333333-3333-4333-8333-333333333333',
    });

    expect(result).toBe(fakeResult);
    expect(captured).toEqual({
      operationType: 'progression.trainer.adjust',
      input: {
        playerId: '11111111-1111-4111-8111-111111111111',
        delta: '-200',
      },
      reason: 'Reversão de pontos duplicados.',
      idempotencyKey: 'progression-adjust:33333333-3333-4333-8333-333333333333',
    });
  });
});
