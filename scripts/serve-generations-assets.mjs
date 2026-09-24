import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const DEFAULT_ROOT = path.resolve(process.env.ASSET_ROOT ?? 'public');

const MIME_TYPES = new Map([
  ['.json', 'application/json; charset=utf-8'],
  ['.glb', 'model/gltf-binary'],
  ['.gltf', 'model/gltf+json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.wasm', 'application/wasm'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

export function mimeTypeFor(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
}

export function resolveStaticPath(urlPath, root = DEFAULT_ROOT) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  if (!decoded.startsWith('/research/')) return null;
  if (decoded.includes('\\\\') || decoded.includes('\\0')) return null;

  const normalizedRoot = path.resolve(root);
  const researchRoot = path.resolve(normalizedRoot, 'research');
  const candidate = path.resolve(normalizedRoot, `.${decoded}`);
  if (!candidate.startsWith(`${researchRoot}${path.sep}`)) return null;
  return candidate;
}

export function parseByteRange(value, size) {
  if (!value?.startsWith('bytes=') || size <= 0) return null;
  const [startRaw, endRaw] = value.slice(6).split('-', 2);

  if (startRaw === '') {
    const suffixLength = Number.parseInt(endRaw ?? '', 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    const start = Math.max(size - suffixLength, 0);
    return { start, end: size - 1 };
  }

  const start = Number.parseInt(startRaw, 10);
  const end = endRaw ? Number.parseInt(endRaw, 10) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return null;
  }

  return { start, end: Math.min(end, size - 1) };
}

function baseHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'Range, Content-Type',
    'access-control-expose-headers': 'Accept-Ranges, Content-Length, Content-Range',
    'x-content-type-options': 'nosniff',
  };
}

async function serveAsset(request, response, root) {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');

  if (requestUrl.pathname === '/health') {
    response.writeHead(200, {
      ...baseHeaders(),
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify({ ok: true, service: 'pokemon-generations-assets' }));
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, baseHeaders());
    response.end();
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {
      ...baseHeaders(),
      allow: 'GET, HEAD, OPTIONS',
      'cache-control': 'no-store',
    });
    response.end();
    return;
  }

  const filePath = resolveStaticPath(requestUrl.pathname, root);
  if (!filePath) {
    response.writeHead(404, { ...baseHeaders(), 'cache-control': 'no-store' });
    response.end('Not found');
    return;
  }

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    response.writeHead(404, { ...baseHeaders(), 'cache-control': 'no-store' });
    response.end('Not found');
    return;
  }

  if (!fileStat.isFile()) {
    response.writeHead(404, { ...baseHeaders(), 'cache-control': 'no-store' });
    response.end('Not found');
    return;
  }

  const commonHeaders = {
    ...baseHeaders(),
    'accept-ranges': 'bytes',
    'cache-control': filePath.endsWith('manifest.json')
      ? 'public, max-age=300'
      : 'public, max-age=86400, stale-while-revalidate=604800',
    'content-type': mimeTypeFor(filePath),
  };

  const requestedRange = request.headers.range;
  if (requestedRange) {
    const range = parseByteRange(requestedRange, fileStat.size);
    if (!range) {
      response.writeHead(416, {
        ...commonHeaders,
        'content-range': `bytes */${fileStat.size}`,
      });
      response.end();
      return;
    }

    const contentLength = range.end - range.start + 1;
    response.writeHead(206, {
      ...commonHeaders,
      'content-length': String(contentLength),
      'content-range': `bytes ${range.start}-${range.end}/${fileStat.size}`,
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath, { start: range.start, end: range.end }).pipe(response);
    return;
  }

  response.writeHead(200, {
    ...commonHeaders,
    'content-length': String(fileStat.size),
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

export function createAssetServer({ root = DEFAULT_ROOT } = {}) {
  return createServer((request, response) => {
    void serveAsset(request, response, root).catch((error) => {
      console.error('asset_server.request_failed', error);
      if (!response.headersSent) {
        response.writeHead(500, { ...baseHeaders(), 'cache-control': 'no-store' });
      }
      response.end('Internal server error');
    });
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (invokedPath === modulePath) {
  const server = createAssetServer();
  server.listen(DEFAULT_PORT, '0.0.0.0', () => {
    console.log(
      'asset_server.ready',
      JSON.stringify({
        port: DEFAULT_PORT,
        root: DEFAULT_ROOT,
      }),
    );
  });
}
