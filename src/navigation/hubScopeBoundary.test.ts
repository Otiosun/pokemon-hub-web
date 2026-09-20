import { describe, expect, it } from 'vitest';
import appSource from '../App.tsx?raw';
import playerPortalClientSource from '../player-api/playerPortalClient.ts?raw';
import cloudflareUatWorkerSource from '../player-api/cloudflareUatWorker.ts?raw';
import playerBattleProxySource from '../../api/hub/player/battle.ts?raw';
import productIntegritySource from './productIntegrity.ts?raw';

const hubApiModules = import.meta.glob('../../api/hub/**/*.ts');

const ALLOWED_HUB_API_MODULES = [
  '../../api/hub/auth/exchange.ts',
  '../../api/hub/player/battle.ts',
  '../../api/hub/player/inventory.ts',
  '../../api/hub/player/location.ts',
  '../../api/hub/player/move-choices.ts',
  '../../api/hub/player/move-choices/resolve.ts',
  '../../api/hub/player/pokedex.ts',
  '../../api/hub/player/pokemon.ts',
  '../../api/hub/player/roster.ts',
  '../../api/hub/player/self.ts',
] as const;

const FORBIDDEN_GAMEPLAY_PATH_FRAGMENTS = [
  '/api/hub/world/',
  '/api/hub/encounter',
  '/api/hub/battle',
  '/api/hub/capture',
  '/api/hub/player/battle/action',
  '/v1/hub/world/',
  '/v1/hub/encounter',
  '/v1/hub/battle',
  '/v1/hub/capture',
  '/v1/hub/player/battle/action',
] as const;

describe('Hub scope boundary', () => {
  it('exposes only companion reads, auth, roster organization and move learning through the same-origin Hub API', () => {
    expect(Object.keys(hubApiModules).sort()).toEqual([...ALLOWED_HUB_API_MODULES].sort());
  });

  it('does not retain world travel or gameplay contracts in the browser client', () => {
    expect(playerPortalClientSource).not.toContain('PlayerPortalWorld');
    expect(playerPortalClientSource).not.toContain('travelPlayerPortalWorld');

    for (const fragment of FORBIDDEN_GAMEPLAY_PATH_FRAGMENTS) {
      expect(playerPortalClientSource).not.toContain(fragment);
    }
  });

  it('keeps active battle consultation read-only at the Hub boundary', () => {
    expect(playerBattleProxySource).toContain("upstreamPath: '/v1/hub/player/battle'");
    expect(playerBattleProxySource).toContain("allowedMethod: 'GET'");
    expect(playerBattleProxySource).not.toContain('/battle/action');
  });

  it('does not proxy gameplay routes through the temporary UAT worker', () => {
    for (const fragment of FORBIDDEN_GAMEPLAY_PATH_FRAGMENTS) {
      expect(cloudflareUatWorkerSource).not.toContain(fragment);
    }
  });

  it('does not register gameplay pages as player-facing product routes', () => {
    const playerFacingRouting = [appSource, productIntegritySource].join('\n');

    for (const path of ['/world', '/travel', '/encounter', '/battle', '/capture']) {
      expect(playerFacingRouting).not.toContain(`'${path}`);
      expect(playerFacingRouting).not.toContain(`"${path}`);
    }
  });
});
