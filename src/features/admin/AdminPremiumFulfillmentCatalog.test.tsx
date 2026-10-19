import { describe, expect, it } from 'vitest';
import { CHAMPION_STORE_PRODUCTS } from '../store/championStoreCatalog';
import { getStoreFulfillmentReadiness } from './AdminPremiumFulfillmentCatalog';

describe('Champions Store: no product is falsely shown as delivered', () => {
  it('has all canonical products represented exactly once', () => {
    expect(CHAMPION_STORE_PRODUCTS).toHaveLength(23);
    expect(new Set(CHAMPION_STORE_PRODUCTS.map((product) => product.code)).size).toBe(23);
    expect(CHAMPION_STORE_PRODUCTS.filter((p) => getStoreFulfillmentReadiness(p.code) === 'AUTOMATED')
      .map((p) => p.code)).toEqual(['2XP']);
  });
  it('marks products without a real backend executor as awaiting configuration', () => {
    for (const code of ['GEN', 'EGG', 'P-U', 'P-E', 'CAP', 'MASTER', 'KIT', 'SAVE+']) {
      expect(getStoreFulfillmentReadiness(code)).toBe('NOT_CONFIGURED');
    }
    expect(getStoreFulfillmentReadiness('LUCK')).toBe('UNAVAILABLE');
    expect(getStoreFulfillmentReadiness('FAKE')).toBe('UNAVAILABLE');
  });
});
