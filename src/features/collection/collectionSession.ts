export type CollectionMode = 'all' | 'boxes' | 'favorites';

type CollectionSession = {
  mode: CollectionMode;
  query: string;
  scrollY: number;
};

const session: CollectionSession = {
  mode: 'all',
  query: '',
  scrollY: 0,
};

export function readCollectionSession(): CollectionSession {
  return { ...session };
}

export function rememberCollectionFilters(mode: CollectionMode, query: string) {
  session.mode = mode;
  session.query = query;
}

export function rememberCollectionScroll(scrollY: number) {
  session.scrollY = Math.max(0, Math.round(scrollY));
}
