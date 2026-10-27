import { describe, expect, it, vi } from 'vitest';
import type { AdminOperationMutationResult } from '../../player-api/playerPortalAdminOperationsClient';
import type { AdminPlayerPokemon } from '../../player-api/playerPortalAdminPlayersClient';
import {
  buildAdminPokemonOperation,
  capabilityForPokemonAction,
  runAdminPokemonOperation,
  type AdminPokemonOperationFields,
} from './adminPokemonOperationWorkflow';

const pokemon: AdminPlayerPokemon = {
  id: '11111111-1111-4111-8111-111111111111',
  formSlug: 'charizard',
  speciesSlug: 'charizard',
  nationalDex: 6,
  nickname: null,
  level: 45,
  xp: '123456',
  currentHp: 91,
  gender: 'MALE',
  shiny: false,
  status: 'ACTIVE',
  abilitySlug: 'blaze',
  natureSlug: 'jolly',
  revision: '12',
  placement: { kind: 'TEAM', boxNo: null, slotNo: 2 },
  ivs: {
    hp: 31,
    attack: 31,
    defense: 31,
    spAttack: 31,
    spDefense: 31,
    speed: 31,
  },
  moves: [],
  persistentConditions: [],
};

const baseFields: AdminPokemonOperationFields = {
  placementKind: 'TEAM',
  boxNo: '1',
  slotNo: '2',
  level: '45',
  xp: '123456',
  currentHp: '91',
  majorStatus: '',
  statusCounter: '',
};

const playerId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const operationId = '44444444-4444-4444-8444-444444444444';

describe('Player 360 Pokemon operation workflow', () => {
  it('maps actions to the exact capability boundaries', () => {
    expect(capabilityForPokemonAction('ROSTER')).toBe('pokemon.roster.manage');
    expect(capabilityForPokemonAction('PROGRESS')).toBe('pokemon.edit.mechanics');
    expect(capabilityForPokemonAction('HP')).toBe('pokemon.edit.mechanics');
    expect(capabilityForPokemonAction('STATUS')).toBe('pokemon.edit.mechanics');
    expect(capabilityForPokemonAction('ARCHIVE')).toBe('pokemon.archive_remove');
  });

  it('builds a revision-locked roster move without leaking UI-only fields', () => {
    const result = buildAdminPokemonOperation({
      action: 'ROSTER',
      playerId,
      pokemon,
      fields: { ...baseFields, placementKind: 'BOX', boxNo: '4', slotNo: '9' },
      reason: 'Move after roster correction',
      requestId,
    });

    expect(result).toEqual({
      ok: true,
      request: {
        requestId,
        operationType: 'pokemon.roster.move',
        input: {
          playerId,
          pokemonInstanceId: pokemon.id,
          target: { placementKind: 'BOX', boxNo: 4, slotNo: 9 },
        },
        reason: 'Move after roster correction',
        expectedRevision: '12',
      },
    });
  });

  it('refuses PC slots outside the canonical 1–30 range before contacting the backend', () => {
    for (const slotNo of ['0', '31', '999']) {
      const result = buildAdminPokemonOperation({
        action: 'ROSTER',
        playerId,
        pokemon,
        fields: { ...baseFields, placementKind: 'BOX', boxNo: '2', slotNo },
        reason: 'Reorganização administrativa de Box',
        requestId,
      });
      expect(result).toEqual({ ok: false, message: 'O slot da Box deve estar entre 1 e 30.' });
    }
  });

  it('validates mechanical corrections before preparing an admin operation', () => {
    expect(
      buildAdminPokemonOperation({
        action: 'PROGRESS',
        playerId,
        pokemon,
        fields: { ...baseFields, level: '101' },
        reason: 'Correction',
        requestId,
      }),
    ).toEqual({ ok: false, message: 'O nível deve estar entre 1 e 100.' });

    expect(
      buildAdminPokemonOperation({
        action: 'STATUS',
        playerId,
        pokemon,
        fields: { ...baseFields, majorStatus: '', statusCounter: '2' },
        reason: 'Clear condition',
        requestId,
      }),
    ).toEqual({ ok: false, message: 'Ao limpar o status, deixe o contador vazio.' });
  });

  it('drives confirmation-required operations to APPLIED automatically', async () => {
    const prepare = vi.fn(async (): Promise<AdminOperationMutationResult> => ({
      status: 'ok',
      operationId,
      operationStatus: 'PENDING_CONFIRMATION',
      replayed: false,
      result: null,
    }));
    const advance = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'ok',
        operationId,
        operationStatus: 'READY',
        result: null,
      } satisfies AdminOperationMutationResult)
      .mockResolvedValueOnce({
        status: 'ok',
        operationId,
        operationStatus: 'APPLIED',
        result: { afterRevision: '13' },
      } satisfies AdminOperationMutationResult);

    const request = {
      requestId,
      operationType: 'pokemon.hp.correct',
      input: { playerId, pokemonInstanceId: pokemon.id, currentHp: 100 },
      reason: 'Fix incorrect HP',
      expectedRevision: pokemon.revision,
    };

    const result = await runAdminPokemonOperation(request, { prepare, advance });

    expect(prepare).toHaveBeenCalledWith(request);
    expect(advance).toHaveBeenNthCalledWith(1, operationId, 'confirm');
    expect(advance).toHaveBeenNthCalledWith(2, operationId, 'apply');
    expect(result).toEqual({
      status: 'applied',
      operationId,
      result: { afterRevision: '13' },
    });
  });

  it('stops at second-admin approval instead of attempting self approval', async () => {
    const prepare = vi.fn(async (): Promise<AdminOperationMutationResult> => ({
      status: 'ok',
      operationId,
      operationStatus: 'PENDING_APPROVAL',
      replayed: false,
      result: null,
    }));
    const advance = vi.fn();

    const result = await runAdminPokemonOperation(
      {
        requestId,
        operationType: 'pokemon.archive',
        input: { playerId, pokemonInstanceId: pokemon.id },
        reason: 'Administrative archive',
        expectedRevision: pokemon.revision,
      },
      { prepare, advance },
    );

    expect(result).toEqual({ status: 'awaiting-approval', operationId });
    expect(advance).not.toHaveBeenCalled();
  });
});
