import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminApiError } from '../../lib/api/admin-api';
import {
  RevisionConflictRecovery,
  isAdminRevisionConflict,
} from './RevisionConflictRecovery';

describe('expectedRevision conflict recovery', () => {
  it('classifies only the authoritative revision-conflict error code', () => {
    expect(
      isAdminRevisionConflict(
        new AdminApiError(
          'conflict',
          'A revisão mudou.',
          409,
          'ADMIN_REVISION_CONFLICT',
          '11111111-1111-4111-8111-111111111111',
        ),
      ),
    ).toBe(true);

    expect(
      isAdminRevisionConflict(
        new AdminApiError(
          'conflict',
          'A idempotência divergiu.',
          409,
          'ADMIN_IDEMPOTENCY_CONFLICT',
          null,
        ),
      ),
    ).toBe(false);
    expect(isAdminRevisionConflict(new Error('generic 409'))).toBe(false);
  });

  it('offers refresh without force-save while the current revision is unknown', () => {
    const html = renderToStaticMarkup(
      <RevisionConflictRecovery
        correlationId="22222222-2222-4222-8222-222222222222"
        currentRevision={null}
        expectedRevision="11"
        onRefresh={() => undefined}
        onReview={() => undefined}
        refreshStatus="idle"
        targetLabel="Batalha 33333333-3333-4333-8333-333333333333"
      />,
    );

    expect(html).toContain('CONFLITO DE REVISÃO');
    expect(html).toContain('Revisão usada');
    expect(html).toContain('11');
    expect(html).toContain('Atualizar estado');
    expect(html).toContain('22222222-2222-4222-8222-222222222222');
    expect(html).not.toContain('Force save');
    expect(html).not.toContain('Forçar');
    expect(html).not.toContain('Aplicar mesmo assim');
  });

  it('requires review of refreshed state before a new preparation', () => {
    const html = renderToStaticMarkup(
      <RevisionConflictRecovery
        correlationId={null}
        currentRevision="12"
        expectedRevision="11"
        onRefresh={() => undefined}
        onReview={() => undefined}
        refreshStatus="ready"
        targetLabel="Batalha atual"
      />,
    );

    expect(html).toContain('Revisão atual');
    expect(html).toContain('12');
    expect(html).toContain('Revisar estado atualizado');
    expect(html).toContain('prepare uma nova operação');
    expect(html).not.toContain('Aplicar mesmo assim');
  });
});
