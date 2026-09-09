import { describe, expect, it } from 'vitest';
import type { PlayerPortalPokemon } from '../../player-api/playerPortalClient';
import { createOwnedPokemonView, findOwnedPokemonView } from './ownedPokemonView';

const teamPokemon: PlayerPortalPokemon = {
  pokemonInstanceId: '11111111-1111-4111-8111-111111111111',
  formId: '22222222-2222-4222-8222-222222222222',
  displayName: 'Charmander',
  nationalDex: 4,
  typeNames: ['Fire'],
  nickname: 'Brasa',
  level: 12,
  currentHp: 31,
  gender: 'M',
  shiny: false,
  placementKind: 'TEAM',
  boxNo: null,
  slotNo: 2,
};

const boxedPokemon: PlayerPortalPokemon = {
  pokemonInstanceId: '33333333-3333-4333-8333-333333333333',
  formId: '44444444-4444-4444-8444-444444444444',
  displayName: null,
  nationalDex: null,
  typeNames: [],
  nickname: null,
  level: 8,
  currentHp: 19,
  gender: null,
  shiny: true,
  placementKind: 'BOX',
  boxNo: 1,
  slotNo: 3,
};

describe('createOwnedPokemonView', () => {
  it('maps authoritative instance and roster fields without inventing favorite or preview data', () => {
    expect(createOwnedPokemonView([teamPokemon, boxedPokemon])).toEqual([
      {
        instanceId: teamPokemon.pokemonInstanceId,
        dex: 4,
        species: 'Charmander',
        nickname: 'Brasa',
        level: 12,
        currentHp: 31,
        types: ['Fire'],
        sex: 'M',
        shiny: false,
        box: 'TIME',
        teamSlot: 2,
        catalogResolved: true,
      },
      {
        instanceId: boxedPokemon.pokemonInstanceId,
        dex: null,
        species: 'REGISTRO INDISPONÍVEL',
        nickname: 'REGISTRO INDISPONÍVEL',
        level: 8,
        currentHp: 19,
        types: [],
        sex: '—',
        shiny: true,
        box: 'BOX 1',
        teamSlot: null,
        catalogResolved: false,
      },
    ]);
  });

  it('resolves real UUID detail records from the same authoritative collection', () => {
    const view = createOwnedPokemonView([teamPokemon, boxedPokemon]);

    expect(findOwnedPokemonView(view, boxedPokemon.pokemonInstanceId)?.instanceId).toBe(
      boxedPokemon.pokemonInstanceId,
    );
    expect(findOwnedPokemonView(view, '55555555-5555-4555-8555-555555555555')).toBeNull();
  });
});
