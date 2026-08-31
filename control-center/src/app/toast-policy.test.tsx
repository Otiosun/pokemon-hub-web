import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToastViewport } from '../components/shell/ToastViewport';
import { TOAST_POLICY } from './toast-policy';

describe('Control Center toast policy', () => {
  it('keeps critical feedback persistent outside the toast channel', () => {
    expect(TOAST_POLICY.success.requiresPersistentSurface).toBe(false);
    expect(TOAST_POLICY.info.requiresPersistentSurface).toBe(false);
    expect(TOAST_POLICY.warning.requiresPersistentSurface).toBe(true);
    expect(TOAST_POLICY.error.requiresPersistentSurface).toBe(true);
    expect(TOAST_POLICY.error.durationMs).toBeNull();
  });

  it('renders operator-readable feedback without technical payloads', () => {
    const html = renderToStaticMarkup(
      <ToastViewport
        onDismiss={() => undefined}
        toasts={[
          { id: 'toast-1', tone: 'success', message: 'Sessão revalidada.' },
          { id: 'toast-2', tone: 'error', message: 'A operação não pôde ser preparada.' },
        ]}
      />,
    );

    expect(html).toContain('Sessão revalidada.');
    expect(html).toContain('A operação não pôde ser preparada.');
    expect(html).toContain('Fechar aviso');
    expect(html).not.toContain('stack');
    expect(html).not.toContain('payload');
  });
});
