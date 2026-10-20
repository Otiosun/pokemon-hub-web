import { describe, expect, it } from 'vitest';
import {
  addChampionStoreSku,
  championStoreCartCount,
  championStoreCartHasPriceChanges,
  championStoreCartTotal,
  sanitizeChampionStoreCart,
  setChampionStoreQuantity,
} from './championStoreCartModel';

describe('champion store cart model', () => {
  it('adds products using canonical prices and merges repeated SKUs', () => {
    let cart = addChampionStoreSku([], '2XP');
    cart = addChampionStoreSku(cart, '2XP');

    expect(cart).toEqual([
      {
        sku: '2XP',
        productCode: '2XP',
        quantity: 2,
        unitPriceSnapshotCents: 4000,
      },
    ]);
    expect(championStoreCartCount(cart)).toBe(2);
    expect(championStoreCartTotal(cart)).toBe(8000);
  });

  it('keeps permanent products single even if added repeatedly', () => {
    let cart = addChampionStoreSku([], 'TERA');
    cart = addChampionStoreSku(cart, 'TERA');
    expect(cart[0]?.quantity).toBe(1);
  });

  it('treats egg variants as independent SKUs', () => {
    let cart = addChampionStoreSku([], 'EGG', 'COMUM');
    cart = addChampionStoreSku(cart, 'EGG', 'ESPECIAL');

    expect(cart.map((line) => line.sku)).toEqual(['EGG:COMUM', 'EGG:ESPECIAL']);
    expect(championStoreCartTotal(cart)).toBe(6500);
  });

  it('removes a line when quantity reaches zero', () => {
    const cart = addChampionStoreSku([], 'P-U');
    expect(setChampionStoreQuantity(cart, 'P-U', 0)).toEqual([]);
  });

  it('rejects non-finite quantity updates without corrupting a saved cart', () => {
    const cart = addChampionStoreSku([], '2XP');
    expect(setChampionStoreQuantity(cart, '2XP', Number.NaN)).toEqual(cart);
    expect(setChampionStoreQuantity(cart, '2XP', Number.POSITIVE_INFINITY)).toEqual(cart);
    expect(setChampionStoreQuantity(cart, '2XP', 5)).toEqual([
      { ...cart[0]!, quantity: 5 },
    ]);
    expect(championStoreCartTotal(setChampionStoreQuantity(cart, '2XP', 5))).toBe(20000);
  });

  it('accepts the supported permanent Luck 2x entitlement only once', () => {
    const first = addChampionStoreSku([], 'LUCK');
    expect(first[0]?.quantity).toBe(1);
    expect(addChampionStoreSku(first, 'LUCK')).toEqual(first);
    expect(sanitizeChampionStoreCart([{ productCode: 'LUCK', quantity: 1 }])[0]?.sku).toBe('LUCK');
  });

  it('sanitizes stale or malformed persisted data without trusting the browser', () => {
    const cart = sanitizeChampionStoreCart([
      {
        productCode: '2XP',
        quantity: 9999,
        unitPriceSnapshotCents: 3500,
      },
      { productCode: 'DOES_NOT_EXIST', quantity: 3 },
      null,
    ]);

    expect(cart).toHaveLength(1);
    expect(cart[0]?.quantity).toBe(52);
    expect(championStoreCartHasPriceChanges(cart)).toBe(true);
    expect(championStoreCartTotal(cart)).toBe(52 * 4000);
  });
});
