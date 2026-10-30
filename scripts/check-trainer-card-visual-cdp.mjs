import { writeFile } from 'node:fs/promises';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const cdpUrl = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9225';
const screenshotPath = process.env.UAT_SCREENSHOT ?? '/tmp/trainer-card-browser-uat.png';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openCdpTarget() {
  const response = await fetch(cdpUrl + '/json/new?about:blank', { method: 'PUT' });
  if (!response.ok) throw new Error('CDP target HTTP ' + response.status);
  const target = await response.json();
  if (!target.webSocketDebuggerUrl) throw new Error('CDP WebSocket URL missing');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CDP socket timeout')), 10000);
    socket.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('CDP socket error')); }, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
    if (!msg.id) return;
    const call = pending.get(msg.id);
    if (!call) return;
    pending.delete(msg.id);
    if (msg.error) call.reject(new Error(call.method + ': ' + msg.error.message));
    else call.resolve(msg.result ?? {});
  });
  socket.addEventListener('close', () => {
    for (const call of pending.values()) call.reject(new Error('CDP closed during ' + call.method));
    pending.clear();
  });

  return {
    socket,
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function inspect(client) {
  const result = await client.send('Runtime.evaluate', {
    expression: `(() => ({
      ready: document.documentElement.dataset.uatReady ?? null,
      fresh: document.documentElement.dataset.uatFresh ?? null,
      badges: document.documentElement.dataset.uatBadges ?? null,
      error: document.documentElement.dataset.uatError ?? null,
      status: document.querySelector('#status')?.textContent ?? null,
      imageLoaded: Boolean(document.querySelector('#card')?.naturalWidth),
      path: location.pathname,
      resources: performance.getEntriesByType('resource').length
    }))()`,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error('Browser evaluate failed: ' + result.exceptionDetails.text);
  return result.result?.value ?? {};
}

const client = await openCdpTarget();
try {
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Page.navigate', { url: baseUrl + '/scripts/trainer-card-visual-uat.html' });
  const deadline = Date.now() + 95000;
  let last = {};
  while (Date.now() < deadline) {
    try {
      last = await inspect(client);
      if (last.error) throw new Error('Trainer Card UAT: ' + last.error);
      if (last.ready === 'true' && last.fresh === 'true' && last.badges === '8' && last.imageLoaded) {
        const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
        if (!screenshot.data) throw new Error('UAT screenshot missing');
        await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
        console.log('TRAINER_CARD_BROWSER_UAT_PASS ' + JSON.stringify({status: last.status, badges: last.badges, fresh: last.fresh}));
        process.exitCode = 0;
        break;
      }
    } catch (error) {
      if (String(error).includes('Trainer Card UAT:')) throw error;
      // Page navigation can briefly invalidate the evaluation context.
    }
    await sleep(250);
  }
  if (last.ready !== 'true' || last.fresh !== 'true' || last.badges !== '8' || !last.imageLoaded) {
    throw new Error('TRAINER_CARD_BROWSER_UAT_TIMEOUT ' + JSON.stringify(last));
  }
} finally {
  client.socket.close();
}
