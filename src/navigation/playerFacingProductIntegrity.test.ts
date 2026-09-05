import { describe, expect, it } from 'vitest';
import hubNavigationSource from '../components/HubNavigation.tsx?raw';
import viewerSource from '../features/asset-lab/GenerationsPokemonViewer.tsx?raw';
import collectionPageSource from '../features/collection/OwnedPokemonCollectionPage.tsx?raw';
import ownedDetailSource from '../features/collection/OwnedPokemonDetailPage.tsx?raw';
import teamPageSource from '../features/team/TeamPage.tsx?raw';

const teamModules = import.meta.glob('../features/team/*');

const PLAYER_FACING_TECHNICAL_MARKERS = [
  'SEM MUTAÇÃO LOCAL',
  'SALVAR COM API',
  'APLICAR COM API',
  'Requer API do RPG',
  'API PENDENTE',
  'ORDEM NÃO SALVA',
  'PRÉVIA LOCAL',
  'TROCA EM PRÉVIA',
  'Nenhuma mudança é aplicada localmente',
  'regras reais do RPG',
  'Abrir build de',
] as const;

describe('player-facing product integrity', () => {
  it('does not expose backend, integration or dev vocabulary in Team surfaces', () => {
    const playerFacingSource = [teamPageSource, collectionPageSource, ownedDetailSource].join('\n');

    for (const marker of PLAYER_FACING_TECHNICAL_MARKERS) {
      expect(playerFacingSource).not.toContain(marker);
    }
  });

  it('does not keep local-only Team mutation state without a real mutation contract', () => {
    expect(teamPageSource).not.toContain('rememberTeamDraftOrder');
    expect(teamPageSource).not.toContain('editingSlot');
    expect(teamPageSource).not.toContain('team-picker');
    expect(ownedDetailSource).not.toContain('readTeamDraftOrder');
    expect(Object.keys(teamModules)).not.toContain('../features/team/teamSession.ts');
    expect(Object.keys(teamModules)).not.toContain('../features/team/teamSession.test.ts');
    expect(Object.keys(teamModules)).not.toContain('../features/team/team-picker.css');
  });

  it('does not promise Team editing from Box before mutation is real', () => {
    expect(collectionPageSource).not.toContain('EDITAR TIME');
  });

  it('paints the loaded 3D model before announcing the viewer as ready', () => {
    const firstPaint = viewerSource.indexOf(
      'activeRuntime.renderer.render(activeRuntime.scene, activeRuntime.camera);',
    );
    const readySignal = viewerSource.indexOf("setViewerState('ready');", firstPaint);

    expect(firstPaint).toBeGreaterThan(-1);
    expect(readySignal).toBeGreaterThan(firstPaint);
  });

  it('places the global menu trigger inside structural chrome', () => {
    expect(hubNavigationSource).toContain('className="hub-menu-chrome"');
    expect(hubNavigationSource).toMatch(/hub-menu-chrome[\s\S]*className="hub-menu-trigger"/);
  });
});
