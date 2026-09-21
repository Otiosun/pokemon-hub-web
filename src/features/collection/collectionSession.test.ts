import { describe, expect, it } from 'vitest';
import {
  readCollectionSession,
  rememberCollectionFilters,
  rememberCollectionScroll,
} from './collectionSession';

describe('owned Pokemon collection session', () => {
  it('preserves mode, filters, search and deep scroll when returning from an owned Pokemon record', () => {
    rememberCollectionFilters('all', 'bulba', {
      type: 'Planta',
      level: '11-20',
      presence: 'team',
      shiny: 'regular',
      sex: 'M',
      sort: 'level-desc',
    });
    rememberCollectionScroll(1764.6);

    expect(readCollectionSession()).toEqual({
      mode: 'all',
      query: 'bulba',
      filters: {
        type: 'Planta',
        level: '11-20',
        presence: 'team',
        shiny: 'regular',
        sex: 'M',
        sort: 'level-desc',
      },
      scrollY: 1765,
    });
  });

  it('never restores a negative Box scroll position', () => {
    rememberCollectionScroll(-90);
    expect(readCollectionSession().scrollY).toBe(0);
  });
});
