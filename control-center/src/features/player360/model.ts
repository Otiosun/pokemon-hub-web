// UI model derived from the canonical backend contract:
// Otiosun/sla/src/modules/admin/player360-contracts.ts
// The browser never supplies principalId. The future Admin API derives it from the authenticated session.

export const PLAYER_STATUSES = ['ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export const PLAYER360_TABS = [
  { id: 'overview', label: 'Visão geral', sections: ['profile', 'onboarding', 'location'] },
  { id: 'pokemon', label: 'Time & Box', sections: ['pokemon'] },
  { id: 'inventory', label: 'Inventário', sections: ['wallets', 'inventory'] },
  { id: 'progression', label: 'Progressão', sections: ['progression', 'unlocks'] },
  { id: 'world', label: 'Mundo', sections: ['location'] },
  { id: 'pokedex', label: 'Pokédex', sections: ['pokedex'] },
  { id: 'battle', label: 'Combate', sections: ['activeBattle', 'activeEncounter', 'effects'] },
  { id: 'history', label: 'Histórico', sections: ['recentActivity'] },
] as const;

export type Player360TabId = (typeof PLAYER360_TABS)[number]['id'];

export interface PlayerSearchFilters {
  readonly status: '' | PlayerStatus;
  readonly trainerNamePrefix: string;
  readonly originRegionId: string;
  readonly identityProvider: string;
  readonly externalId: string;
  readonly includeSensitive: boolean;
}

export interface PlayerSearchQuery {
  readonly status?: PlayerStatus;
  readonly trainerNamePrefix?: string;
  readonly originRegionId?: string;
  readonly identityProvider?: string;
  readonly externalId?: string;
  readonly includeSensitive: boolean;
  readonly limit: number;
}

export const EMPTY_PLAYER_SEARCH_FILTERS: PlayerSearchFilters = {
  status: '',
  trainerNamePrefix: '',
  originRegionId: '',
  identityProvider: '',
  externalId: '',
  includeSensitive: false,
};

function normalized(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function hasIdentityLookup(filters: PlayerSearchFilters): boolean {
  return (
    normalized(filters.identityProvider) !== undefined ||
    normalized(filters.externalId) !== undefined
  );
}

export function validatePlayerSearchFilters(filters: PlayerSearchFilters): readonly string[] {
  const errors: string[] = [];
  const provider = normalized(filters.identityProvider);
  const externalId = normalized(filters.externalId);

  if ((provider === undefined) !== (externalId === undefined)) {
    errors.push('Identidade externa exige provedor e identificador juntos.');
  }
  if (externalId !== undefined && !filters.includeSensitive) {
    errors.push('Busca por identidade externa exige leitura sensível autorizada.');
  }
  if (
    normalized(filters.trainerNamePrefix)?.length &&
    filters.trainerNamePrefix.trim().length > 80
  ) {
    errors.push('Nome do treinador excede 80 caracteres.');
  }

  return errors;
}

export function toPlayerSearchQuery(filters: PlayerSearchFilters): PlayerSearchQuery {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(normalized(filters.trainerNamePrefix)
      ? { trainerNamePrefix: normalized(filters.trainerNamePrefix) }
      : {}),
    ...(normalized(filters.originRegionId)
      ? { originRegionId: normalized(filters.originRegionId) }
      : {}),
    ...(normalized(filters.identityProvider)
      ? { identityProvider: normalized(filters.identityProvider) }
      : {}),
    ...(normalized(filters.externalId) ? { externalId: normalized(filters.externalId) } : {}),
    includeSensitive: filters.includeSensitive,
    limit: 25,
  };
}

export const PLAYER360_UNSUPPORTED_SECTIONS = ['COOLDOWNS', 'PUNISHMENTS_FLAGS'] as const;
