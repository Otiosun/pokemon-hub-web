import { AdminApiError, type AdminApiErrorKind } from '../../lib/api/admin-api';

export const ACCESS_LOGOUT_PATH = '/cdn-cgi/access/logout' as const;

export interface AdminSessionLogoutResult {
  readonly logoutPath: typeof ACCESS_LOGOUT_PATH;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function kindForStatus(status: number): AdminApiErrorKind {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 400) return 'invalid';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  return 'server';
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function failedLogout(response: Response): Promise<AdminApiError> {
  let code = `HTTP_${response.status}`;
  let message = 'Não foi possível encerrar a sessão administrativa.';
  let correlationId = safeString(response.headers.get('x-correlation-id'));

  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && isRecord(payload.error)) {
      code = safeString(payload.error.code) ?? code;
      message = safeString(payload.error.message) ?? message;
      correlationId = safeString(payload.error.correlationId) ?? correlationId;
    }
  } catch {
    // The safe fallback above intentionally hides transport/body internals.
  }

  return new AdminApiError(kindForStatus(response.status), message, response.status, code, correlationId);
}

export async function logoutCurrentSession(
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AdminSessionLogoutResult> {
  let response: Response;
  try {
    response = await fetchImpl(`${apiBaseUrl}/admin/v1/session/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-control-center-csrf': '1',
      },
      body: '{}',
    });
  } catch {
    throw new AdminApiError(
      'network',
      'Não foi possível alcançar a Admin API.',
      null,
      'NETWORK_ERROR',
      null,
    );
  }

  if (!response.ok) throw await failedLogout(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AdminApiError(
      'server',
      'A Admin API retornou uma resposta de logout inválida.',
      response.status,
      'INVALID_LOGOUT_RESPONSE',
      safeString(response.headers.get('x-correlation-id')),
    );
  }

  if (!isRecord(payload) || payload.logoutPath !== ACCESS_LOGOUT_PATH) {
    throw new AdminApiError(
      'server',
      'A Admin API retornou uma resposta de logout inválida.',
      response.status,
      'INVALID_LOGOUT_RESPONSE',
      safeString(response.headers.get('x-correlation-id')),
    );
  }

  return { logoutPath: ACCESS_LOGOUT_PATH };
}
