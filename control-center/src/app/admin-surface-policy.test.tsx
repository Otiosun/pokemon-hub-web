import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminDrawer } from '../components/shell/AdminDrawer';
import { ADMIN_SURFACE_POLICY } from './admin-surface-policy';

describe('administrative modal and drawer policy', () => {
  it('uses drawers for context/configuration and reserves modal for final critical confirmation', () => {
    expect(ADMIN_SURFACE_POLICY).toEqual({
      details: 'drawer',
      configuration: 'drawer',
      finalCriticalConfirmation: 'modal',
    });
  });

  it('gives drawers explicit dialog semantics and a deterministic close control', () => {
    const html = renderToStaticMarkup(
      <AdminDrawer title="Contexto administrativo" onClose={() => undefined}>
        Conteúdo
      </AdminDrawer>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Contexto administrativo');
    expect(html).toContain('Fechar painel');
  });
});
