import type {
  ContentLibraryQuery,
  ContentReleaseStatus,
  ContentResourceKind,
} from '../../lib/api/admin-api';

export const CONTENT_RESOURCE_KINDS = [
  'SPECIES',
  'MOVE',
  'ITEM',
  'AREA',
  'ENCOUNTER_TABLE',
  'REWARD',
  'EFFECT',
] as const satisfies readonly ContentResourceKind[];

export const CONTENT_RELEASE_STATUSES = [
  'DRAFT',
  'VALIDATED',
  'PUBLISHED',
  'ARCHIVED',
] as const satisfies readonly ContentReleaseStatus[];

export const CONTENT_RESOURCE_LABELS: Readonly<Record<ContentResourceKind, string>> = {
  SPECIES: 'Espécies',
  MOVE: 'Golpes',
  ITEM: 'Itens',
  AREA: 'Áreas',
  ENCOUNTER_TABLE: 'Encontros',
  REWARD: 'Recompensas',
  EFFECT: 'Efeitos',
};

export interface ContentLibraryFilters {
  readonly query: string;
  readonly resourceKind: '' | ContentResourceKind;
  readonly releaseStatus: '' | ContentReleaseStatus;
  readonly active: '' | 'true' | 'false';
  readonly limit: number;
}

export const EMPTY_CONTENT_LIBRARY_FILTERS: ContentLibraryFilters = {
  query: '',
  resourceKind: '',
  releaseStatus: '',
  active: '',
  limit: 30,
};

export function toContentLibraryQuery(filters: ContentLibraryFilters): ContentLibraryQuery {
  const query = filters.query.trim();
  return {
    ...(query.length === 0 ? {} : { query }),
    ...(filters.resourceKind === '' ? {} : { resourceKind: filters.resourceKind }),
    ...(filters.releaseStatus === '' ? {} : { releaseStatus: filters.releaseStatus }),
    ...(filters.active === '' ? {} : { active: filters.active === 'true' }),
    limit: filters.limit,
  };
}
