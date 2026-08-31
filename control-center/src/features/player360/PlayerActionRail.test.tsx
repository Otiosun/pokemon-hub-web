import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Player360Overview } from '../../lib/api/admin-api';
import { PlayerActionRail } from './PlayerActionRail';

const PLAYER = {
  activeBattle: { id: 'battle-live' },
  activeEncounter: null,
} as unknown as Player360Overview;

describe('Player 360 action rail surface', () => {
  it('renders only contextual Registry actions while execution remains closed', () => {
    const html = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['wallet.adjust', 'battle.force_cancel', 'encounter.force_close'])}
        player={PLAYER}
      />,
    );

    expect(html).toContain('AÇÕES CONTEXTUAIS');
    expect(html).toContain('Corrigir saldo');
    expect(html).toContain('Cancelar batalha');
    expect(html).not.toContain('Fechar encounter');
    expect(html).toContain('R2');
    expect(html).toContain('R3');
    expect(html).toContain('EXECUÇÃO AINDA BLOQUEADA');
    expect(html).not.toContain('Aplicar agora');
    expect(html).not.toContain('F4.12');
    expect(html).not.toContain('SQL');
    expect(html).not.toContain('JSON');
  });

  it('exposes a prepare-only entry for battle force-cancel without claiming execution', () => {
    const html = renderToStaticMarkup(
      <PlayerActionRail
        capabilities={new Set(['battle.force_cancel'])}
        player={PLAYER}
      />,
    );

    expect(html).toContain('PREPARAR OPERAÇÃO');
    expect(html).toContain('Preparar cancelamento');
    expect(html).toContain('battle.force_cancel');
    expect(html).not.toContain('Aplicar cancelamento');
    expect(html).not.toContain('Executar cancelamento');
  });

  it('shows a stable no-action state instead of leaking unavailable privileges', () => {
    const html = renderToStaticMarkup(
      <PlayerActionRail capabilities={new Set()} player={PLAYER} />,
    );

    expect(html).toContain('Nenhuma ação administrativa disponível neste contexto.');
    expect(html).not.toContain('wallet.adjust');
    expect(html).not.toContain('battle.force_cancel');
  });
});
