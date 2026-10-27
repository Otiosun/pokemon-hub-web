import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHAMPION_STORE_PRODUCTS } from '../store/championStoreCatalog';
import { AdminPremiumFulfillmentCatalog, getStoreFulfillmentReadiness } from './AdminPremiumFulfillmentCatalog';

describe('Champions Store: no product is falsely shown as delivered', () => {
  it('has all canonical products represented exactly once', () => {
    expect(CHAMPION_STORE_PRODUCTS).toHaveLength(23);
    expect(new Set(CHAMPION_STORE_PRODUCTS.map((product) => product.code)).size).toBe(23);
    expect(CHAMPION_STORE_PRODUCTS.filter((p) => getStoreFulfillmentReadiness(p.code) === 'AUTOMATED')
      .map((p) => p.code)).toEqual(['LUCK', '2XP']);
  });
  it('shows a manual case route, never a fake automated-delivery button for undefined packs', () => {
    const html = renderToStaticMarkup(
      <AdminPremiumFulfillmentCatalog onOpenCases={() => {}} />,
    );
    expect(html).toContain('ABRIR ATENDIMENTO MANUAL DE GAMEPASSES');
    expect(html).toContain('ATENDIMENTO MANUAL · SEM EXECUTOR');
    expect(html).toContain('COM EXECUTOR');
  });

  it('marks products without a real backend executor as awaiting configuration', () => {
    for (const code of ['GEN', 'EGG', 'P-U', 'P-E', 'CAP', 'KIT', 'SAVE+']) {
      expect(getStoreFulfillmentReadiness(code)).toBe('NOT_CONFIGURED');
    }
    expect(getStoreFulfillmentReadiness('MASTER')).toBe('CONDITIONAL');
    expect(getStoreFulfillmentReadiness('LUCK')).toBe('AUTOMATED');
    expect(getStoreFulfillmentReadiness('FAKE')).toBe('UNAVAILABLE');
  });
});
