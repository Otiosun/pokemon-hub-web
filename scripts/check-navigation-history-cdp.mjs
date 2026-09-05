const cdpEndpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9223';
const baseUrl = (process.env.BASE_URL ?? 'http://127.0.0.1:4174').replace(/\/$/, '');

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
    socket.addEventListener('open', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    socket.addEventListener('error', () => {
      clearTimeout(timeout);
      reject(new Error(`CDP WebSocket failed: ${url}`));
    }, { once: true });
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
  while (Date.now() < deadline) {
    try {
      if (await runtimeValue(client, `Boolean(${expression})`)) return;
    } catch {
      // Navigation can briefly invalidate the execution context. Retry until timeout.
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function waitForRoute(client, route, marker) {
  const routeLiteral = JSON.stringify(route);
  const markerLiteral = JSON.stringify(marker);
  await waitFor(client, `location.pathname === ${routeLiteral}`, `route ${route}`);
  await waitFor(client, `document.readyState === 'complete'`, `${route} document.readyState`);
  await waitFor(
    client,
    `document.body && document.body.textContent && document.body.textContent.includes(${markerLiteral})`,
    `${route} marker ${marker}`,
  );
}

async function navigate(client, route, marker) {
  await client.send('Page.navigate', { url: `${baseUrl}${route}` });
  await waitForRoute(client, route, marker);
}

async function reload(client, route, marker, ignoreCache) {
  await client.send('Page.reload', { ignoreCache });
  await waitForRoute(client, route, marker);
}

async function clickRoute(client, route, marker) {
  const routeLiteral = JSON.stringify(route);
  const clicked = await runtimeValue(
    client,
    `(() => {
      const target = Array.from(document.querySelectorAll('a[href]')).find((anchor) => {
        try { return new URL(anchor.href, location.href).pathname === ${routeLiteral}; }
        catch { return false; }
      });
      if (!target) return false;
      target.click();
      return true;
    })()`,
  );
  if (!clicked) throw new Error(`Could not find an in-app link to ${route}`);
  await waitForRoute(client, route, marker);
}

async function traverseHistory(client, direction, route, marker) {
  const method = direction === 'back' ? 'history.back()' : 'history.forward()';
  try {
    await runtimeValue(client, method);
  } catch {
    // A successful traversal may destroy the old execution context before CDP replies.
  }
  await waitForRoute(client, route, marker);
}

async function main() {
  const targetResponse = await fetch(`${cdpEndpoint}/json/new?about:blank`, { method: 'PUT' });
  if (!targetResponse.ok) throw new Error(`Could not create CDP target: HTTP ${targetResponse.status}`);
  const target = await targetResponse.json();
  if (!target.webSocketDebuggerUrl) throw new Error('CDP target did not expose webSocketDebuggerUrl');

  const socket = await connectWebSocket(target.webSocketDebuggerUrl);
  const client = new CdpClient(socket);

  try {
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    console.log(`HISTORY_SMOKE base=${baseUrl}`);

    await navigate(client, '/pokedex/4', 'Charmander');
    await reload(client, '/pokedex/4', 'Charmander', true);
    console.log('RELOAD_COLD /pokedex/4 = OK');
    await reload(client, '/pokedex/4', 'Charmander', false);
    console.log('RELOAD_HOT /pokedex/4 = OK');

    await navigate(client, '/pokedex', 'Índice Nacional');
    await clickRoute(client, '/pokedex/4', 'Charmander');
    await traverseHistory(client, 'back', '/pokedex', 'Índice Nacional');
    await traverseHistory(client, 'forward', '/pokedex/4', 'Charmander');
    console.log('BACK_FORWARD Pokédex = OK');

    await navigate(client, '/pokemon', 'Time + Box');
    await clickRoute(client, '/pokemon/pkm-charmander-a1', 'Brasa');
    await traverseHistory(client, 'back', '/pokemon', 'Time + Box');
    await traverseHistory(client, 'forward', '/pokemon/pkm-charmander-a1', 'Brasa');
    console.log('BACK_FORWARD Box → Pokémon = OK');

    console.log('NAVIGATION_HISTORY_CONTRACT_OK');
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
