import { describe, expect, it } from 'vitest';
import {
  CONTENT_RESOURCE_KINDS,
  EMPTY_CONTENT_LIBRARY_FILTERS,
  toContentLibraryQuery,
} from './content-library-model';

describe('Content Library filter model', () => {
  it('keeps the seven backend-authoritative resource kinds', () => {
    expect(CONTENT_RESOURCE_KINDS).toEqual([
      'SPECIES',
      'MOVE',
      'ITEM',
      'AREA',
      'ENCOUNTER_TABLE',
      'REWARD',
      'EFFECT',
    ]);
  });

  it('omits empty optional filters and preserves the bounded page size', () => {
    expect(toContentLibraryQuery(EMPTY_CONTENT_LIBRARY_FILTERS)).toEqual({ limit: 30 });
  });

  it('trims text and forwards typed filters without client authority', () => {
    expect(
      toContentLibraryQuery({
        query: '  pikachu  ',
        resourceKind: 'SPECIES',
        releaseStatus: 'DRAFT',
        active: 'true',
        limit: 30,
      }),
    ).toEqual({
      query: 'pikachu',
      resourceKind: 'SPECIES',
      releaseStatus: 'DRAFT',
      active: true,
      limit: 30,
    });
  });
});
