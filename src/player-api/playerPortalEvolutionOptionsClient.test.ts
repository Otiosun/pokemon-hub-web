import { describe, expect, it, vi } from 'vitest';
import { getPlayerEvolutionOptions } from './playerPortalEvolutionOptionsClient';

const pokemonInstanceId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const itemOption = {
  targetDisplayName: 'Vaporeon',
  triggerKind: 'ITEM',
  requiredLevel: null,
  relativePhysicalStats: null,
  itemId,
  itemDisplayName: 'Pedra da Água',
  itemQuantity: '2',
  conditionActive: null,
};

describe('authenticated Pokémon evolution options', () => {
  it('reads server-projected target, owned item quantity and battle block', async () => {
    const fetcher = vi.fn(async () => Response.json({
      blockedByBattle: true, options: [itemOption],
    }));
    expect(await getPlayerEvolutionOptions(pokemonInstanceId, fetcher, false)).toEqual({
      status: 'authenticated', blockedByBattle: true, options: [itemOption],
    });
    expect(fetcher).toHaveBeenCalledWith(
      `/api/hub/player/pokemon/evolution-options?pokemonInstanceId=${pokemonInstanceId}`,
      { method: 'GET', credentials: 'include', headers: { accept: 'application/json' } },
    );
  });

  it('fails closed on missing login, inaccessible backend or showcase', async () => {
    const noLogin = vi.fn(async () => Response.json({}, { status: 401 }));
    expect(await getPlayerEvolutionOptions(pokemonInstanceId, noLogin, false)).toEqual({
      status: 'unauthenticated',
    });
    const noApi = vi.fn(async () => Response.json({}, { status: 503 }));
    expect(await getPlayerEvolutionOptions(pokemonInstanceId, noApi, false)).toEqual({
      status: 'unavailable',
    });
    expect(await getPlayerEvolutionOptions(pokemonInstanceId, noApi, true)).toEqual({
      status: 'unavailable',
    });
    expect(noApi).toHaveBeenCalledTimes(1);
  });

  it('rejects forged quantities, unsupported kinds and invalid Pokémon IDs', async () => {
    const invalid = [{ ...itemOption, itemQuantity: '-1' }, {
      ...itemOption, triggerKind: 'FREE',
    }, { ...itemOption, itemId: 'another-player' }];
    for (const option of invalid) {
      const fetcher = vi.fn(async () => Response.json({
        blockedByBattle: false, options: [option],
      }));
      await expect(getPlayerEvolutionOptions(pokemonInstanceId, fetcher, false))
        .rejects.toThrow('Invalid evolution options response');
    }
    const neverCalled = vi.fn(async () => Response.json({}));
    await expect(getPlayerEvolutionOptions('bad-id', neverCalled, false)).rejects.toThrow();
    expect(neverCalled).not.toHaveBeenCalled();
  });

  it('supports level conditions while keeping the server authoritative', async () => {
    const level = {
      targetDisplayName: 'Hitmonlee', triggerKind: 'LEVEL', requiredLevel: 20,
      relativePhysicalStats: 'ATTACK_GT_DEFENSE', itemId: null,
      itemDisplayName: null, itemQuantity: null, conditionActive: null,
    };
    const condition = {
      targetDisplayName: 'Sylveon', triggerKind: 'CONDITION', requiredLevel: null,
      relativePhysicalStats: null, itemId: null,
      itemDisplayName: null, itemQuantity: null, conditionActive: false,
    };
    const fetcher = vi.fn(async () => Response.json({
      blockedByBattle: false, options: [level, condition],
    }));
    expect(await getPlayerEvolutionOptions(pokemonInstanceId, fetcher, false))
      .toMatchObject({ status: 'authenticated', options: [level, condition] });
  });
});
