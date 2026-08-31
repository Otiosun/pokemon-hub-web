import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { PokedexPanel } from './PokedexPanel';

const PLAYER = {
  pokedex: {
    speciesSeen: 2,
    speciesCaught: 1,
    entries: [
      {
        speciesId: '00000000-0000-4000-8000-000000000201',
        nationalDex: 25,
        slug: 'pikachu',
        seenCount: '8',
        caughtCount: '2',
        firstSeenAt: '2026-08-20T12:00:00.000Z',
        lastSeenAt: '2026-08-30T12:00:00.000Z',
        firstCaughtAt: '2026-08-22T12:00:00.000Z',
        lastCaughtAt: '2026-08-29T12:00:00.000Z',
      },
      {
        speciesId: '00000000-0000-4000-8000-000000000202',
        nationalDex: 1,
        slug: 'bulbasaur',
        seenCount: '3',
        caughtCount: '0',
        firstSeenAt: '2026-08-21T12:00:00.000Z',
        lastSeenAt: '2026-08-28T12:00:00.000Z',
        firstCaughtAt: null,
        lastCaughtAt: null,
      },
    ],
  },
} as unknown as Player360Overview;

describe('Player 360 Pokedex tab', () => {
  it('shows canonical seen/caught history without public-site decoration or mutations', () => {
    const html = renderToStaticMarkup(<PokedexPanel player={PLAYER} />);

    expect(html).toContain('POKÉDEX');
    expect(html).toContain('2 ESPÉCIES VISTAS');
    expect(html).toContain('1 ESPÉCIE CAPTURADA');
    expect(html).toContain('#001');
    expect(html).toContain('Bulbasaur');
    expect(html).toContain('VISTO');
    expect(html).toContain('#025');
    expect(html).toContain('Pikachu');
    expect(html).toContain('CAPTURADO');
    expect(html).toContain('8 vistos');
    expect(html).toContain('2 capturados');
    expect(html).toContain('Primeiro encontro');
    expect(html).toContain('Última captura');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('Editar Pokédex');
    expect(html).not.toContain('Marcar capturado');
    expect(html).not.toContain('Resetar Pokédex');
  });

  it('keeps an explicit empty Pokedex state', () => {
    const html = renderToStaticMarkup(
      <PokedexPanel
        player={{ ...PLAYER, pokedex: { speciesSeen: 0, speciesCaught: 0, entries: [] } }}
      />,
    );

    expect(html).toContain('Nenhum registro de Pokédex para este jogador.');
  });
});
