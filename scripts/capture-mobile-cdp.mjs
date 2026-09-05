import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cdpEndpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9222';
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4174';
const outputDir = process.env.OUTPUT_DIR ?? '/tmp/mobile-viewport-evidence';
const diagnosticsDir = process.env.DIAGNOSTICS_DIR ?? '/tmp/mobile-viewer-diagnostics';

const captures = [
  { name: 'jornada', route: '/jornada', marker: 'TRAINER REGISTRATION LICENSE' },
  { name: 'pokedex', route: '/pokedex', marker: 'Índice Nacional' },
  { name: 'species-004', route: '/pokedex/4', marker: 'Charmander · Idle', viewer: true },
  { name: 'box', route: '/pokemon', marker: 'Time + Box' },
  { name: 'team', route: '/team', marker: 'Meu Time' },
  {
    name: 'owned-charmander',
    route: '/pokemon/pkm-charmander-a1',
    marker: 'Charmander · Idle',
    viewer: true,
  },
];
const widths = [320, 360, 390, 430];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageText(data) {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
  return String(data);
}

async function connectWebSocket(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`CDP WebSocket timeout: ${url}`)), 10_000);
    socket.addEventListener(
      'open',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      'error',
      () => {
        clearTimeout(timeout);
        reject(new Error(`CDP WebSocket failed: ${url}`));
      },
      { once: true },
    );
  });
  return socket;
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(messageText(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result ?? {});
    });
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error(`CDP WebSocket closed during ${pending.method}`));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function runtimeValue(client, expression) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text ?? 'Runtime.evaluate exception');
  }
  return response.result?.value;
}

async function waitFor(client, expression, label, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      if (await runtimeValue(client, `Boolean(${expression})`)) return;
      lastError = null;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  const suffix = lastError ? ` (${lastError.message})` : '';
  throw new Error(`Timed out waiting for ${label}${suffix}`);
}

async function settleVisualFrame(client, viewer) {
  const expression = viewer
    ? `new Promise((resolve) => {
        const canvas = document.querySelector('canvas.generations-canvas');
        const ready = canvas && canvas.getBoundingClientRect().width > 0 && canvas.getBoundingClientRect().height > 0;
        if (!ready) return resolve(false);
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve(true), 180)));
      })`
    : `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 80))))`;
  const settled = await runtimeValue(client, expression);
  if (viewer && settled !== true) throw new Error('3D canvas had no measurable viewport before capture');
}

async function navigateAndWait(client, capture) {
  await client.send('Page.navigate', { url: `${baseUrl}${capture.route}` });
  await waitFor(client, `document.readyState === 'complete'`, `${capture.route} document.readyState`);
  const marker = JSON.stringify(capture.marker);
  await waitFor(
    client,
    `document.body && document.body.textContent && document.body.textContent.includes(${marker})`,
    `${capture.route} marker ${capture.marker}`,
  );
  if (capture.viewer) {
    await waitFor(
      client,
      `document.querySelector('canvas.generations-canvas') && document.querySelector('canvas.generations-canvas').getBoundingClientRect().width > 0`,
      `${capture.route} 3D canvas`,
    );
  }
  await settleVisualFrame(client, capture.viewer);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(diagnosticsDir, { recursive: true });

  const targetResponse = await fetch(`${cdpEndpoint}/json/new?about:blank`, { method: 'PUT' });
  if (!targetResponse.ok) throw new Error(`Could not create CDP target: HTTP ${targetResponse.status}`);
  const target = await targetResponse.json();
  if (!target.webSocketDebuggerUrl) throw new Error('CDP target did not expose webSocketDebuggerUrl');

  const socket = await connectWebSocket(target.webSocketDebuggerUrl);
  const client = new CdpClient(socket);
  const viewerSummary = [];

  try {
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    for (const width of widths) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: true,
        screenWidth: width,
        screenHeight: 900,
      });

      for (const capture of captures) {
        console.log(`CAPTURE ${capture.route} @ ${width}x900`);
        await navigateAndWait(client, capture);

        const screenshot = await client.send('Page.captureScreenshot', {
          format: 'png',
          fromSurface: true,
          captureBeyondViewport: false,
        });
        const fileBase = `${capture.name}-${width}x900`;
        await writeFile(path.join(outputDir, `${fileBase}.png`), Buffer.from(screenshot.data, 'base64'));

        const dom = await runtimeValue(client, 'document.documentElement.outerHTML');
        await writeFile(path.join(diagnosticsDir, `${fileBase}.dom.html`), dom, 'utf8');

        if (capture.viewer) {
          const text = await runtimeValue(client, 'document.body?.textContent ?? ""');
          const state = text.includes('Charmander · Idle')
            ? 'ready'
            : text.includes('Falha ao carregar Charmander.')
              ? 'failed'
              : text.includes('carregando Charmander')
                ? 'loading'
                : 'unknown';
          const line = `VIEWER_STATE ${capture.name} ${width}px = ${state}`;
          viewerSummary.push(line);
          console.log(line);
        }
      }
    }
  } finally {
    client.close();
  }

  await writeFile(path.join(diagnosticsDir, 'viewer-state-summary.txt'), `${viewerSummary.join('\n')}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
