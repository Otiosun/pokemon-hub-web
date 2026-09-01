import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pagePath = fileURLToPath(new URL('./ContentLibraryPage.tsx', import.meta.url));

describe('Content Library pagination wiring', () => {
  it('binds every continuation cursor to the query that produced the current result set', async () => {
    const source = await readFile(pagePath, 'utf8');

    expect(source).toContain('committedQuery');
    expect(source).toContain('setCommittedQuery(query)');
    expect(source).toContain('cursor === undefined ? query : committedQuery');
    expect(source).toContain('client.searchContent(requestQuery, cursor)');
    expect(source).not.toContain('client.searchContent(query, cursor)');
  });
});
