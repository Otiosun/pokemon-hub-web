import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BenefitsPage, benefitPresentation } from './BenefitsPage';

describe('Jornada / Meus Benefícios design and honest empty states', () => {
  it('renders the trainer registry heading and never invents entitlements while loading', () => {
    const html = renderToStaticMarkup(createElement(BenefitsPage));
    expect(html).toContain('Meus Benefícios');
    expect(html).toContain('Consultando o registro oficial de benefícios');
    expect(html).not.toContain('Benefícios ativos</h2>');
    expect(html).not.toContain('Nenhuma vantagem ativa por enquanto');
    expect(html).toContain('Voltar à Jornada');
  });

  it('identifies only documented entitlement keys as specific benefits', () => {
    expect(benefitPresentation('XP_2X').name).toBe('Experiência em dobro');
    expect(benefitPresentation('CAPTURE_LUCK_2X').name).toBe('Bênção da Sorte');
    expect(benefitPresentation('UNMAPPED_KEY').name).toBe('UNMAPPED KEY');
  });

  it('uses genuine pinned Kenney sprites; never generated icons', () => {
    const { sprite } = benefitPresentation('XP_2X');
    expect(sprite).toContain('raw.githubusercontent.com/shorepine/kenney/');
    expect(sprite).toContain('/2d/Medals/shaded_medal7.png');
  });
});
