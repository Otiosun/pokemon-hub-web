import { describe, expect, it } from 'vitest';
import { CHAMPION_STORE_BY_CODE } from './championStoreCatalog';
import { championStoreDisplayPrice } from './ChampionStoreCanonicalDisplaySync';

describe('Champion Store canonical display pricing', () => {
  it('formats ordinary products from the canonical integer-cent price', () => {
    const xp = CHAMPION_STORE_BY_CODE.get('2XP');
    expect(xp).toBeDefined();
    expect(championStoreDisplayPrice(xp!)).toBe('R$ 40,00');
  });

  it('shows the lowest variant price for products with variants', () => {
    const egg = CHAMPION_STORE_BY_CODE.get('EGG');
    expect(egg).toBeDefined();
    expect(championStoreDisplayPrice(egg!)).toBe('A partir de R$ 20,00');
  });
});
