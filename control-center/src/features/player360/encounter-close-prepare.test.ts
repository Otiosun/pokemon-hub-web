import { describe, expect, it } from 'vitest';
import { buildEncounterClosePrepareRequest } from './encounter-close-prepare';

const PLAYER_ID = '11111111-1111-4111-8111-111111111111';
const ENCOUNTER_ID = '22222222-2222-4222-8222-222222222222';

describe('encounter.close prepare-only request', () => {
  it('derives the strict backend input and expected revision from Player 360', () => {
    const request = buildEncounterClosePrepareRequest({
      playerId: PLAYER_ID,
      encounterId: ENCOUNTER_ID,
      encounterRevision: '11',
      reason: 'Encounter preso após resolução operacional incompleta.',
      idempotencyKey: 'encounter-close:33333333-3333-4333-8333-333333333333',
    });

    expect(request).toEqual({
      operationType: 'encounter.close',
      input: { playerId: PLAYER_ID, encounterId: ENCOUNTER_ID },
      reason: 'Encounter preso após resolução operacional incompleta.',
      expectedRevision: '11',
      idempotencyKey: 'encounter-close:33333333-3333-4333-8333-333333333333',
    });
    expect(Object.keys(request.input)).toEqual(['playerId', 'encounterId']);
  });

  it('fails closed before HTTP when reason or encounter revision is invalid', () => {
    expect(() =>
      buildEncounterClosePrepareRequest({
        playerId: PLAYER_ID,
        encounterId: ENCOUNTER_ID,
        encounterRevision: '11',
        reason: '   ',
        idempotencyKey: 'encounter-close:44444444-4444-4444-8444-444444444444',
      }),
    ).toThrow('reason');

    expect(() =>
      buildEncounterClosePrepareRequest({
        playerId: PLAYER_ID,
        encounterId: ENCOUNTER_ID,
        encounterRevision: '11.5',
        reason: 'Correção operacional.',
        idempotencyKey: 'encounter-close:55555555-5555-4555-8555-555555555555',
      }),
    ).toThrow('revision');
  });
});
