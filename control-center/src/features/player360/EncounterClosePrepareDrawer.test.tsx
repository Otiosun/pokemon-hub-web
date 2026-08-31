import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  AdminApiClient,
  AdminPrepareOperationRequest,
  AdminPrepareOperationResult,
  Player360Overview,
} from '../../lib/api/admin-api';
import { EncounterClosePrepareDrawer, prepareEncounterClose } from './EncounterClosePrepareDrawer';

const PLAYER = {
  playerId: '11111111-1111-4111-8111-111111111111',
  profile: { trainerName: 'Red' },
  activeEncounter: {
    id: '22222222-2222-4222-8222-222222222222',
    status: 'ENGAGED',
    areaId: '33333333-3333-4333-8333-333333333333',
    contentReleaseId: '44444444-4444-4444-8444-444444444444',
    rulesetId: '55555555-5555-4555-8555-555555555555',
    revision: '11',
    createdAt: '2026-08-31T10:00:00.000Z',
    updatedAt: '2026-08-31T10:05:00.000Z',
  },
  activeBattle: null,
  effects: [],
} as unknown as Player360Overview;

describe('encounter.close prepare drawer', () => {
  it('shows validated encounter context and concurrency token without exposing apply lifecycle', () => {
    const client = {
      prepareOperation: async () => {
        throw new Error('not called during render');
      },
    } as Pick<AdminApiClient, 'prepareOperation'>;

    const html = renderToStaticMarkup(
      <EncounterClosePrepareDrawer client={client} onClose={() => undefined} player={PLAYER} />,
    );

    expect(html).toContain('PREPARAR FECHAMENTO');
    expect(html).toContain('Red');
    expect(html).toContain('22222222-2222-4222-8222-222222222222');
    expect(html).toContain('ENGAGED');
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

    const result = await prepareEncounterClose(client, {
      playerId: PLAYER.playerId,
      encounterId: '22222222-2222-4222-8222-222222222222',
      encounterRevision: '11',
      reason: 'Encounter preso após resolução operacional incompleta.',
      idempotencyKey: 'encounter-close:66666666-6666-4666-8666-666666666666',
    });

    expect(result).toBe(fakeResult);
    expect(captured).toEqual({
      operationType: 'encounter.close',
      input: {
        playerId: '11111111-1111-4111-8111-111111111111',
        encounterId: '22222222-2222-4222-8222-222222222222',
      },
      reason: 'Encounter preso após resolução operacional incompleta.',
      expectedRevision: '11',
      idempotencyKey: 'encounter-close:66666666-6666-4666-8666-666666666666',
    });
  });
});
