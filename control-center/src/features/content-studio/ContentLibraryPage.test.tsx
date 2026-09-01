import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContentLibraryPage } from './ContentLibraryPage';

describe('Content Library page', () => {
  it('renders a calm read-only library surface with all canonical filters', () => {
    const html = renderToStaticMarkup(
      <ContentLibraryPage
        client={{
          searchContent: async () => ({ items: [], nextCursor: null }),
          listUnpublishedContent: async () => [],
          diffContentRelease: async ({ fromReleaseId, toReleaseId }) => ({
            fromReleaseId,
            toReleaseId,
            sections: [],
          }),
        }}
      />,
    );

    expect(html).toContain('BIBLIOTECA DE CONTEÚDO');
    expect(html).toContain('Buscar por nome, slug ou release');
    expect(html).toContain('Espécies');
    expect(html).toContain('Golpes');
    expect(html).toContain('Itens');
    expect(html).toContain('Áreas');
    expect(html).toContain('Encontros');
    expect(html).toContain('Recompensas');
    expect(html).toContain('Efeitos');
    expect(html).toContain('ALTERAÇÕES NÃO PUBLICADAS');
    expect(html).toContain('DRAFT');
    expect(html).toContain('VALIDATED');
    expect(html).toContain('Consultar alterações');
    expect(html).toContain('READ-ONLY');
    expect(html).not.toContain('Publicar');
    expect(html).not.toContain('Diff');
    expect(html).not.toContain('Salvar');
    expect(html).not.toContain('JSON');
  });
});
