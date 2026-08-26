import {
  DEFAULT_COLLECTION_FILTERS,
  type CollectionFilterState,
} from './collectionFilters';

export type CollectionMode = 'all' | 'boxes' | 'favorites';

type CollectionSession = {
  mode: CollectionMode;
  query: string;
  filters: CollectionFilterState;
  scrollY: number;
};

const session: CollectionSession = {
  mode: 'all',
  query: '',
  filters: { ...DEFAULT_COLLECTION_FILTERS },
  scrollY: 0,
};

export function readCollectionSession(): CollectionSession {
  return {
    ...session,
    filters: { ...session.filters },
  };
}

export function rememberCollectionFilters(
  mode: CollectionMode,
  query: string,
  filters: CollectionFilterState,
) {
  session.mode = mode;
  session.query = query;
  session.filters = { ...filters };
}

export function rememberCollectionScroll(scrollY: number) {
  session.scrollY = Math.max(0, Math.round(scrollY));
}
