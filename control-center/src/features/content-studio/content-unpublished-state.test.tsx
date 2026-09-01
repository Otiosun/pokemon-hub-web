import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient, type ContentUnpublishedRelease } from '../../lib/api/admin-api';
import { ContentLibraryPage } from './ContentLibraryPage';

const RELEASE_ID = '33333333-3333-4333-8333-333333333333';

const unpublished: readonly ContentUnpublishedRelease[] = [
  {
    releaseId: RELEASE_ID,
    releaseNo: '92',
    releaseName: 'Kanto balance pass',
    status: 'DRAFT',
    workflowState: 'EDITING',
    revision: '3',
    parentReleaseId: null,
    createdAt: '2026-08-31T22:00:00.000Z',
    validatedAt: null,
    recordedChangeCount: '3',
    lastChangedAt: '2026-08-31T22:15:00.000Z',
  },
];

describe('Content Studio unpublished state F5.11', () => {
  it('exposes the backend read without client authority fields', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(unpublished), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new AdminApiClient('https://admin.example.com', fetchImpl);

    await expect(client.listUnpublishedContent()).resolves.toEqual(unpublished);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://admin.example.com/admin/v1/content/unpublished',
      {
        method: 'GET',
        credentials: 'include',
        headers: { accept: 'application/json' },
      },
    );
  });

  it('renders a read-only unpublished-state entry point without diff or lifecycle controls', () => {
    const html = renderToStaticMarkup(
      <ContentLibraryPage
        client={{
          searchContent: async () => ({ items: [], nextCursor: null }),
          listUnpublishedContent: async () => unpublished,
        }}
      />,
    );

    expect(html).toContain('ALTERAÇÕES NÃO PUBLICADAS');
    expect(html).toContain('Atualizar estado');
    expect(html).not.toContain('Publicar agora');
    expect(html).not.toContain('Ver diff');
  });
});
