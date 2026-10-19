import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Premium2XpCartCheckout } from './Premium2XpCartCheckout';
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

afterEach(() => vi.unstubAllEnvs());

describe('2XP cart staging boundary', () => {
  it('does not render checkout unless both frontend preview flags are explicit', () => {
    expect(renderToStaticMarkup(<Premium2XpCartCheckout cart={[xp]} />)).toBe('');
    vi.stubEnv('VITE_PREMIUM_STAGING_UI', '1');
    expect(renderToStaticMarkup(<Premium2XpCartCheckout cart={[xp]} />)).toBe('');
    vi.stubEnv('VITE_PREMIUM_STAGING_TARGET', 'preview');
    const html = renderToStaticMarkup(<Premium2XpCartCheckout cart={[xp]} />);
    expect(html).toContain('CRIAR PEDIDO 2XP');
    expect(html).toContain('SEM COBRANÇA');
  });

  it('refuses orders involving other products or invalid quantities', () => {
    vi.stubEnv('VITE_PREMIUM_STAGING_UI', '1');
    vi.stubEnv('VITE_PREMIUM_STAGING_TARGET', 'preview');
    expect(renderToStaticMarkup(<Premium2XpCartCheckout cart={[other]} />)).toBe('');
    expect(renderToStaticMarkup(<Premium2XpCartCheckout cart={[xp, other]} />)).toBe('');
    expect(renderToStaticMarkup(<Premium2XpCartCheckout cart={[{ ...xp, quantity: 53 }]} />)).toBe('');
    expect(renderToStaticMarkup(<Premium2XpCartCheckout cart={[]} />)).toBe('');
  });
});
