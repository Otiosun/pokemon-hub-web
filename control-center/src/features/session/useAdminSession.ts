import { useCallback, useEffect, useMemo, useState } from 'react';
import { type AdminApiClient, AdminApiError, type AdminSession } from '../../lib/api/admin-api';

export type AdminSessionState =
  | { readonly status: 'loading'; readonly session: null; readonly error: null }
  | { readonly status: 'ready'; readonly session: AdminSession; readonly error: null }
  | {
      readonly status: 'unauthenticated' | 'forbidden' | 'unavailable';
      readonly session: null;
      readonly error: AdminApiError;
    };

function failureState(error: unknown): AdminSessionState {
  const normalized =
    error instanceof AdminApiError
      ? error
      : new AdminApiError(
          'server',
          'Não foi possível validar a sessão administrativa.',
          null,
          'SESSION_STATE_ERROR',
          null,
        );

  if (normalized.kind === 'unauthenticated') {
    return { status: 'unauthenticated', session: null, error: normalized };
  }
  if (normalized.kind === 'forbidden') {
    return { status: 'forbidden', session: null, error: normalized };
  }
  return { status: 'unavailable', session: null, error: normalized };
}

export function useAdminSession(client: AdminApiClient) {
  const [state, setState] = useState<AdminSessionState>({
    status: 'loading',
    session: null,
    error: null,
  });

  const reload = useCallback(async () => {
    setState({ status: 'loading', session: null, error: null });
    try {
      const session = await client.getSession();
      setState({ status: 'ready', session, error: null });
    } catch (error) {
      setState(failureState(error));
    }
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const capabilities = useMemo(
    () => new Set(state.session?.capabilities.map((capability) => capability.key) ?? []),
    [state.session],
  );

  return { state, capabilities, reload };
}

export function displayAdminRole(session: AdminSession | null): string {
  if (session === null) return '—';
  if (session.roles.includes('OWNER_SECURITY_ADMIN')) return 'MASTER';
  return session.roles[0] ?? 'ADMIN';
}
