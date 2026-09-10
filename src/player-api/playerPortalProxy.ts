import type { PlayerPortalFetcher } from './playerPortalClient';

type PlayerPortalProxyOptions = {
  baseUrl: string | null;
  upstreamPath: `/v1/hub/${string}`;
  allowedMethod: 'GET' | 'POST' | 'PUT';
  fetcher?: PlayerPortalFetcher;
};

const REQUEST_HEADERS = ['accept', 'content-type', 'cookie'] as const;
const RESPONSE_HEADERS = ['cache-control', 'content-type', 'set-cookie'] as const;

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

  const headers = selectRequestHeaders(request.headers);
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

  const responseHeaders = selectResponseHeaders(upstream.headers);
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

function selectRequestHeaders(source: Headers): Headers {
  const selected = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = source.get(name);
    if (value !== null) selected.set(name, value);
  }
  if (!selected.has('accept')) selected.set('accept', 'application/json');
  return selected;
}

function selectResponseHeaders(source: Headers): Headers {
  const selected = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = source.get(name);
    if (value !== null) selected.set(name, value);
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
