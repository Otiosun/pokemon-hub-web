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
  xp: '120',
  xpToNextLevel: 469,
  currentHp: 31,
  maxHp: 31,
  natureDisplayName: 'Adamant',
  abilityDisplayName: 'Blaze',
  ivs: { hp: 31, attack: 30, defense: 29, spAttack: 12, spDefense: 18, speed: 27 },
  gender: 'M',
  shiny: false,
  placementKind: 'TEAM',
  boxNo: null,
  slotNo: 2,
  conditions: [],
  moves: [
    {
      slotNo: 1,
      moveId: '99999999-9999-4999-8999-999999999999',
      displayName: 'Scratch',
      typeName: 'Normal',
      category: 'PHYSICAL',
      power: 40,
      accuracy: 100,
      ppCurrent: 35,
      maxPp: 35,
    },
  ],
};

const boxedPokemon: PlayerPortalPokemon = {
  pokemonInstanceId: '33333333-3333-4333-8333-333333333333',
  formId: '44444444-4444-4444-8444-444444444444',
  displayName: null,
  nationalDex: null,
  typeNames: [],
  nickname: null,
  level: 8,
  xp: '42',
  xpToNextLevel: 217,
  currentHp: 0,
  maxHp: 24,
  natureDisplayName: 'Calm',
  abilityDisplayName: 'Torrent',
  ivs: { hp: 20, attack: 12, defense: 25, spAttack: 28, spDefense: 31, speed: 19 },
  gender: null,
  shiny: true,
  placementKind: 'BOX',
  boxNo: 1,
  slotNo: 3,
  conditions: ['POISON'],
  moves: [],
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
        xp: '120',
        xpToNextLevel: 469,
        currentHp: 31,
        maxHp: 31,
        conditions: [],
        fainted: false,
        nature: 'Adamant',
        ability: 'Blaze',
        ivs: { hp: 31, attack: 30, defense: 29, spAttack: 12, spDefense: 18, speed: 27 },
        moves: [
          {
            slotNo: 1,
            moveId: '99999999-9999-4999-8999-999999999999',
            displayName: 'Scratch',
            typeName: 'Normal',
            category: 'PHYSICAL',
            power: 40,
            accuracy: 100,
            ppCurrent: 35,
            maxPp: 35,
          },
        ],
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
        xp: '42',
        xpToNextLevel: 217,
        currentHp: 0,
        maxHp: 24,
        conditions: ['POISON'],
        fainted: true,
        nature: 'Calm',
        ability: 'Torrent',
        ivs: { hp: 20, attack: 12, defense: 25, spAttack: 28, spDefense: 31, speed: 19 },
        moves: [],
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
