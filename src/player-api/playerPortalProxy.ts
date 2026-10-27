import type { PlayerPortalFetcher } from './playerPortalClient';
import {
  scopedSessionCookie,
  stageExchangeCookie,
  type SessionScope,
} from './premiumStagingSessionCookies.js';

type PlayerPortalProxyOptions = {
  baseUrl: string | null;
  upstreamPath: `/v1/hub/${string}`;
  allowedMethod: 'GET' | 'POST' | 'PUT';
  fetcher?: PlayerPortalFetcher;
  sessionScope?: SessionScope;
  responseCookieMode?: 'normal' | 'omit' | 'premium-stage-exchange';
};

const REQUEST_HEADERS = ['accept', 'content-type'] as const;
const RESPONSE_HEADERS = ['cache-control', 'content-type'] as const;

export async function proxyPlayerPortalRequest(
  request: Request,
  options: PlayerPortalProxyOptions,
): Promise<Response> {
  if (request.method !== options.allowedMethod) {
    return jsonError(405, 'METHOD_NOT_ALLOWED', { allow: options.allowedMethod });
  }

  const upstreamUrl = resolveUpstreamUrl(options.baseUrl, options.upstreamPath);
  if (upstreamUrl === null) {
    return jsonError(503, 'PLAYER_PORTAL_UNAVAILABLE');
  }

  const scope = options.sessionScope ?? 'normal';
  const headers = selectRequestHeaders(request.headers, scope);
  if (scope === 'premium-stage' && !headers.has('cookie')) {
    return jsonError(401, 'STAGING_SESSION_REQUIRED');
  }
  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (request.method === 'POST' || request.method === 'PUT') {
    init.body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await (options.fetcher ?? fetch)(upstreamUrl, init);
  } catch {
    return jsonError(502, 'PLAYER_PORTAL_BAD_GATEWAY');
  }

  const cookieMode = options.responseCookieMode ?? (scope === 'normal' ? 'normal' : 'omit');
  const responseHeaders = selectResponseHeaders(upstream.headers, cookieMode);
  if (cookieMode === 'premium-stage-exchange' && upstream.ok) {
    const rewritten = stageExchangeCookie(upstream.headers.get('set-cookie'));
    if (!rewritten) return jsonError(502, 'STAGING_SESSION_EXCHANGE_FAILED');
    responseHeaders.set('set-cookie', rewritten);
  }
  if (!responseHeaders.has('cache-control')) responseHeaders.set('cache-control', 'no-store');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

function resolveUpstreamUrl(baseUrl: string | null, upstreamPath: string): string | null {
  if (baseUrl === null || baseUrl.trim() === '') return null;

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  if (base.username !== '' || base.password !== '' || base.search !== '' || base.hash !== '') {
    return null;
  }

  const localHttp =
    base.protocol === 'http:' &&
    (base.hostname === 'localhost' || base.hostname === '127.0.0.1' || base.hostname === '[::1]');
  if (base.protocol !== 'https:' && !localHttp) return null;

  const prefix = base.pathname === '/' ? '' : base.pathname.replace(/\/+$/, '');
  return `${base.origin}${prefix}${upstreamPath}`;
}

function selectRequestHeaders(source: Headers, scope: SessionScope): Headers {
  const selected = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = source.get(name);
    if (value !== null) selected.set(name, value);
  }
  const cookie = scopedSessionCookie(source.get('cookie'), scope);
  if (cookie) selected.set('cookie', cookie);
  if (!selected.has('accept')) selected.set('accept', 'application/json');
  return selected;
}

function selectResponseHeaders(
  source: Headers,
  mode: 'normal' | 'omit' | 'premium-stage-exchange',
): Headers {
  const selected = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = source.get(name);
    if (value !== null) selected.set(name, value);
  }
  if (mode === 'normal' && source.has('set-cookie')) {
    selected.set('set-cookie', source.get('set-cookie')!);
  }
  return selected;
}

function jsonError(
  status: number,
  error: string,
  extraHeaders: Readonly<Record<string, string>> = {},
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}
