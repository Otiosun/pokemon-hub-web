import { describe, expect, it } from 'vitest';
import {
  decodePendingAdminPokemonOperation,
  encodePendingAdminPokemonOperation,
  pendingAdminPokemonStorageKey,
} from './adminPokemonPendingIntent';

const playerId = '22222222-2222-4222-8222-222222222222';
const request = {
  requestId: '11111111-1111-4111-8111-111111111111',
  operationType: 'pokemon.progress.correct',
  input: { playerId, pokemonInstanceId: '33333333-3333-4333-8333-333333333333', level: 20, xp: 0 },
  reason: 'Auditoria de evolução atrasada',
  expectedRevision: '12',
};
describe('uncertain admin Pokémon operation stays idempotent across reloads', () => {
  it('recovers exact request body and key after a reload', () => {
    const stored = encodePendingAdminPokemonOperation(playerId, request, 100);
    expect(decodePendingAdminPokemonOperation(stored, playerId, 101)).toEqual({
      playerId, request, createdAt: 100,
    });
    expect(pendingAdminPokemonStorageKey(playerId)).toContain(playerId);
  });
  it('does not load another player, malformed entry or expired request', () => {
    const raw = encodePendingAdminPokemonOperation(playerId, request, 100);
    expect(decodePendingAdminPokemonOperation(raw, '44444444-4444-4444-8444-444444444444', 101)).toBeNull();
    expect(decodePendingAdminPokemonOperation('not json',playerId,101)).toBeNull();
    expect(decodePendingAdminPokemonOperation(raw,playerId,100+13*60*60*1000)).toBeNull();
  });
  it('rejects wrong recipient and non Pokémon mutation', () => {
    expect(() => encodePendingAdminPokemonOperation(playerId,{
      ...request,input:{...request.input,playerId:'44444444-4444-4444-8444-444444444444'},
    })).toThrow();
    expect(() => encodePendingAdminPokemonOperation(playerId,{
      ...request,operationType:'premium.gift.grant',
    })).toThrow();
  });
  it('never trusts manipulated request payload stored in session', () => {
    const original=JSON.parse(encodePendingAdminPokemonOperation(playerId,request,100)) as Record<string,unknown>;
    const bad={...original,request:{...request,input:{...request.input,playerId:'44444444-4444-4444-8444-444444444444'}}};
    expect(decodePendingAdminPokemonOperation(JSON.stringify(bad),playerId,101)).toBeNull();
  });
});
