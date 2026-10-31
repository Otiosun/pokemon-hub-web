import { writeFile, mkdir } from 'node:fs/promises';

const base = (process.env.BASE_URL ?? 'http://127.0.0.1:4177').replace(/\/$/, '');
const cdp = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9227';
const output = process.env.OUTPUT_DIR ?? '/tmp/premium-browser-synthetic';
const playerId = '11111111-1111-4111-8111-111111111111';
const adminId = '22222222-2222-4222-8222-222222222222';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function connect() {
  const r = await fetch(cdp + '/json/new?about:blank', { method: 'PUT' });
  if (!r.ok) throw Error('CDP target error ' + r.status);
  const target = await r.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const tm = setTimeout(() => reject(Error('CDP WebSocket timeout')), 10000);
    ws.addEventListener('open', () => { clearTimeout(tm); resolve(); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(tm); reject(Error('CDP socket error')); }, { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data));
    if (!msg.id) return;
    const req = pending.get(msg.id);
    if (!req) return;
    pending.delete(msg.id);
    if (msg.error) req.reject(Error(req.method + ': ' + msg.error.message));
    else req.resolve(msg.result ?? {});
  });
  const send = (method, params={}) => new Promise((resolve,reject) => {
    const key = ++id;
    pending.set(key, { resolve, reject, method });
    ws.send(JSON.stringify({id:key,method,params}));
  });
  return { send, close: () => ws.close() };
}

async function evalIn(client, expr) {
  const r = await client.send('Runtime.evaluate', { expression: expr, awaitPromise:true, returnByValue:true });
  if (r.exceptionDetails) throw Error('Browser exception: '+r.exceptionDetails.text);
  return r.result?.value;
}

async function until(client, expr, description, timeout=15000) {
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline) {
    try { if(await evalIn(client, 'Boolean('+expr+')')) return; }
    catch { /* transient navigation context */ }
    await sleep(120);
  }
  throw Error('Browser timed out on '+description);
}

function assert(v, why) { if(!v) throw Error(why); }

/**
 * Browser-only synthetic API. The network guard never contacts external APIs
 * or the real Hub backend. This script runs in an ephemeral GitHub Actions
 * Chrome profile and is NEVER injected into the SPA source or deployed.
 */
const injected = `(() => {
  const nativeFetch = window.fetch.bind(window);
  window.__premiumSyntheticCalls = [];
  const playerId = '${playerId}';
  const adminId = '${adminId}';
  const json = (body, status=200) => Promise.resolve(new Response(JSON.stringify(body), {
    status, headers: { 'content-type':'application/json' }
  }));
  window.fetch = (input, init={}) => {
    const raw = typeof input === 'string' ? input : input?.url;
    if (!raw) return Promise.reject(Error('Synthetic browser: invalid fetch'));
    const url = new URL(raw, location.href);
    if (!url.pathname.startsWith('/api/')) {
      if (url.origin !== location.origin) return Promise.reject(Error('Synthetic browser blocked cross-origin fetch'));
      return nativeFetch(input, init);
    }
    window.__premiumSyntheticCalls.push({ path:url.pathname, method:init.method || 'GET' });
    const role=new URLSearchParams(location.hash.slice(1)).get('role') || 'none';
    if (url.pathname === '/api/hub/admin/premium-auth/self') {
      if (role === 'none') return json({error:'NOT_AUTHENTICATED'},401);
      const owner=role==='owner';
      const capabilities=role==='blocked' ? ['central.view'] :
        ['central.view','premium.delivery.grant','player.read'];
      return json({admin:{principalId:adminId,owner,capabilities}});
    }
    if (role === 'none' || role === 'blocked')
      return json({error:'PERMISSION_DENIED'},403);
    if (url.pathname === '/api/hub/admin/premium/delivery/catalog')
      return json({products:[
        {sku:'2XP',title:'XP em Dobro',maxQuantity:5,entitlementKey:'premium.xp2x',grantModel:'TIMED',durationSecondsPerUnit:604800},
        {sku:'LUCK',title:'Sorte em Dobro',maxQuantity:1,entitlementKey:'premium.luck',grantModel:'PERMANENT',durationSecondsPerUnit:null}
      ]});
    if (url.pathname === '/api/hub/admin/premium/players')
      return json({players:[{playerId,trainerName:'Treinador Sintético',trainerLevel:8,status:'ACTIVE'}]});
    if (url.pathname === '/api/hub/admin/premium' && url.searchParams.get('resource')==='deliveries')
      return json({deliveries:[]});
    if (url.pathname === '/api/hub/admin/premium/delivery' && init.method==='POST') {
      const body=JSON.parse(init.body||'{}');
      if (body.playerId!==playerId || !body.requestId || !body.reason || body.reason.length<8)
        return json({error:'INVALID'},400);
      return json({applied:true,replayed:false,requestId:body.requestId,
        entitlement:{playerId:body.playerId}});
    }
    return json({error:'SYNTHETIC_ENDPOINT_DISABLED'},503);
  };
})();`;

async function runScenario(client, role, width) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width, height:800, deviceScaleFactor:1, mobile:true,
  });
  await client.send('Page.navigate', {url:base+'/admin/premium#role='+role});
  await until(client, 'document.readyState==="complete"', 'document ready');
  const marker=role==='owner' || role==='delegate' ? 'Conceder benefício' : 'ACESSO ISOLADO';
  await until(client, 'document.body?.textContent?.includes('+JSON.stringify(marker)+')',role+' marker');
  if (role === 'owner' || role === 'delegate') {
    const opened = await evalIn(client, `(() => {
      const box=document.querySelector('details.premium-id-fallback');
      const input=box?.querySelector('input');
      if (!box || !input) return false;
      box.open=true; input.focus(); return true;
    })()`);
    assert(opened,role+' did not offer the documented manual Player ID fallback');
    await client.send('Input.insertText',{text:playerId});
    await until(client,
      'Boolean(document.querySelector("details.premium-id-fallback form button[type=submit]:not([disabled])"))',
      role+' valid synthetic player ID');
    await evalIn(client,
      'document.querySelector("details.premium-id-fallback form button[type=submit]").click()');
    await until(client,
      'document.body?.textContent?.includes("DESTINATÁRIO SELECIONADO")',
      role+' selected synthetic recipient');
    await until(client,
      'Array.from(document.querySelectorAll("select option")).some(o=>o.textContent.includes("Sorte em Dobro"))',
      role+' asynchronously loaded synthetic delivery catalog');
  }
  const state=await evalIn(client, `(() => ({
    body: document.body.textContent,
    tabs: Array.from(document.querySelectorAll('nav[aria-label="Seções da Central Premium"] button')).map(b=>b.textContent),
    requests: window.__premiumSyntheticCalls,
    width: document.documentElement.scrollWidth
  }))()`);
  const shot=await client.send('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  await writeFile(output+'/'+role+'-'+width+'.png', Buffer.from(shot.data,'base64'));
  assert(state.width <= width+1,role+' layout horizontal overflow at '+width+'px: '+state.width);
  if (role === 'owner') {
    assert(state.tabs.length===7,'Owner lost Premium tabs');
    assert(state.body.includes('XP em Dobro'),'Owner catalog did not load');
    assert(state.body.includes('Sorte em Dobro'),'Owner LUCK did not load');
  } else if (role === 'delegate') {
    assert(state.tabs.length===1,'Delegate sees unauthorized owner-only tabs');
    assert(state.body.includes('ENTREGAS AUTORIZADAS'),'Delegate identity was not shown');
  } else {
    assert(state.tabs.length===0,'Unauthorized user sees Premium tabs');
    assert(!state.requests.some(r=>r.path.includes('/delivery/catalog')),
      'Unauthorized user loaded private catalog');
  }
  console.log('PREMIUM_SYNTHETIC_BROWSER '+role+' '+width+'px PASS');
}

async function main(){
  await mkdir(output, {recursive:true});
  const client=await connect();
  try {
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.addScriptToEvaluateOnNewDocument', {source:injected});
    for(const width of [360,390]){
      for(const role of ['owner','delegate','none','blocked']){
        await runScenario(client,role,width);
      }
    }
    console.log('PREMIUM_SYNTHETIC_BROWSER_UAT_PASS (8 states; all API responses synthetic)');
  } finally {
    client.close();
  }
}
main().catch(e=>{ console.error(e); process.exit(1); });
