import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PremiumStagePlayerSearch, searchPremiumStagePlayers } from './PremiumStagePlayerSearch';
import { AdminPremiumDeliveryPanel } from './AdminPremiumDeliveryPanel';

const playerId = '11111111-1111-4111-8111-111111111111';
const player = {
  playerId,
  trainerName: 'Aurora',
  trainerLevel: 12,
  status: 'ACTIVE',
};

describe('Premium mobile operator experience', () => {
  it('looks up suggestions through the authenticated, read-only player search', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ players: [player] }), { status: 200 }));
    expect(await searchPremiumStagePlayers(' Au ', fetcher)).toEqual([player]);
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/hub/admin/premium/players?q=Au');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
  });

  it('does not send requests with too-short or control-character searches', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ players: [] }), { status: 200 }));
    expect(await searchPremiumStagePlayers('A', fetcher)).toEqual([]);
    expect(await searchPremiumStagePlayers('a\\nb', fetcher)).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refuses unauthorized and malformed search responses', async () => {
    await expect(searchPremiumStagePlayers('Au', async () => new Response(null, { status: 403 }))).rejects.toThrow();
    await expect(searchPremiumStagePlayers('Au', async () =>
      new Response(JSON.stringify({ players: [{ ...player, playerId: 'invalid' }] }), { status: 200 }))).rejects.toThrow();
  });

  it('exposes a single search input with helpful feedback, no mandatory search button', () => {
    const html = renderToStaticMarkup(createElement(PremiumStagePlayerSearch, {
      onSelect: () => {},
      onEditing: () => {},
    }));
    expect(html).toContain('type="search"');
    expect(html).toContain('role="status"');
    expect(html).not.toContain('BUSCAR</button>');
  });

  it('leaves the confirmation checkbox interactive while the grant action is locked', () => {
    const html = renderToStaticMarkup(createElement(AdminPremiumDeliveryPanel, { playerId }));
    const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0];
    expect(checkbox).toBeDefined();
    expect(checkbox).not.toContain('disabled');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Mínimo de 8 caracteres');
    expect(html).toContain('Confirmo a identidade do jogador');
    expect(html).toContain('Marque a confirmação');
  });

  it('renders an explicit audit-loading state instead of pretending zero entries', () => {
    const html = renderToStaticMarkup(createElement(AdminPremiumDeliveryPanel, { playerId }));
    expect(html).toContain('Selecione o jogador para consultar as entregas.');
    expect(html).not.toContain('Nenhuma entrega manual registrada ou histórico ainda indisponível.');
  });
});
