import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { WorldLocationPanel } from './WorldLocationPanel';

const PLAYER = {
  location: {
    areaId: '00000000-0000-4000-8000-000000000901',
    enteredAt: '2026-08-30T18:45:00.000Z',
    revision: '12',
  },
} as unknown as Player360Overview;

describe('Player 360 world location tab', () => {
  it('shows only the canonical current location context', () => {
    const html = renderToStaticMarkup(<WorldLocationPanel player={PLAYER} />);

    expect(html).toContain('MUNDO &amp; LOCALIZAÇÃO');
    expect(html).toContain('LOCALIZAÇÃO ATUAL');
    expect(html).toContain('00000000-0000-4000-8000-000000000901');
    expect(html).toContain('2026-08-30T18:45:00.000Z');
    expect(html).toContain('REV 12');
    expect(html).not.toContain('Encounter');
    expect(html).not.toContain('Efeitos');
    expect(html).not.toContain('Mover jogador');
    expect(html).not.toContain('Teleportar');
  });

  it('shows an explicit no-location state', () => {
    const html = renderToStaticMarkup(
      <WorldLocationPanel
        player={{ ...PLAYER, location: { areaId: null, enteredAt: null, revision: null } }}
      />,
    );

    expect(html).toContain('Sem localização ativa registrada.');
  });
});
