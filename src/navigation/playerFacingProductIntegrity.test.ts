import { describe, expect, it } from 'vitest';
import collectionPageSource from '../features/collection/OwnedPokemonCollectionPage.tsx?raw';
import ownedDetailSource from '../features/collection/OwnedPokemonDetailPage.tsx?raw';
import pokedexSpeciesSource from '../features/pokedex/PokedexSpeciesPage.tsx?raw';
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

  it('keeps a visible 2D fallback while the selected 3D viewer is not ready', () => {
    expect(pokedexSpeciesSource).toContain('onReadyChange={setViewerReady}');
    expect(pokedexSpeciesSource).toContain('pokedex-species-model-fallback');
    expect(pokedexSpeciesSource).toContain('!viewerReady');

    expect(ownedDetailSource).toContain('owned-detail-model-fallback');
    expect(ownedDetailSource).toContain('!viewerReady');
  });
});
