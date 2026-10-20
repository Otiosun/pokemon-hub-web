import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { canShowStaged2XpCheckout, Premium2XpCartCheckout } from './Premium2XpCartCheckout';
import type { ChampionStoreCartLine } from './championStoreCartModel';

const xp: ChampionStoreCartLine = {
  sku: '2XP',
  productCode: '2XP',
  quantity: 2,
  unitPriceSnapshotCents: 4000,
};
const other: ChampionStoreCartLine = {
  sku: 'TERA',
  productCode: 'TERA',
  quantity: 1,
  unitPriceSnapshotCents: 5000,
};

describe('2XP cart staging boundary', () => {
  it('requires BOTH explicit compile-time preview flags', () => {
    expect(canShowStaged2XpCheckout([xp], { ui: undefined, target: undefined })).toBe(false);
    expect(canShowStaged2XpCheckout([xp], { ui: '1', target: undefined })).toBe(false);
    expect(canShowStaged2XpCheckout([xp], { ui: undefined, target: 'preview' })).toBe(false);
    expect(canShowStaged2XpCheckout([xp], { ui: '1', target: 'production' })).toBe(false);
    expect(canShowStaged2XpCheckout([xp], { ui: '1', target: 'preview' })).toBe(true);
  });

  it('refuses non-2XP products, mixed baskets and invalid quantities', () => {
    const flags = { ui: '1', target: 'preview' };
    expect(canShowStaged2XpCheckout([other], flags)).toBe(false);
    expect(canShowStaged2XpCheckout([xp, other], flags)).toBe(false);
    expect(canShowStaged2XpCheckout([{ ...xp, quantity: 53 }], flags)).toBe(false);
    expect(canShowStaged2XpCheckout([{ ...xp, quantity: Number.NaN }], flags)).toBe(false);
    expect(canShowStaged2XpCheckout([], flags)).toBe(false);
  });

  it('renders the staged order action only when the effective bundle flags allow it', () => {
    const html = renderToStaticMarkup(<Premium2XpCartCheckout cart={[xp]} />);
    const allowed = canShowStaged2XpCheckout([xp], {
      ui: import.meta.env.VITE_PREMIUM_STAGING_UI,
      target: import.meta.env.VITE_PREMIUM_STAGING_TARGET,
    });
    if (allowed) {
      expect(html).toContain('Verificando uma sessão exclusiva');
      expect(html).not.toContain('CRIAR PEDIDO 2XP');
    } else {
      expect(html).toBe('');
    }
  });
});
