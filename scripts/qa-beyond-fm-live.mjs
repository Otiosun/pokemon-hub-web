import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.BEYOND_FM_URL || 'https://pokemon-hub-web-git-feat-b-484900-bellcranel1921-4681s-projects.vercel.app/jornada';
const tmp = mkdtempSync(path.join(tmpdir(), 'beyond-fm-e2e-'));
const names = [
  ['01_Qumu_Cynthia.mp3', 440],
  ['02_Michael_Tai_National_Park.mp3', 523],
  ['03_The_Zame_Driftveil_City.mp3', 659],
  ['04_Satoshi_Alola_Instrumental.mp3', 784],
];
const files = [];
for (const [name, tone] of names) {
  const file = path.join(tmp, name);
  const proc = spawnSync('ffmpeg', ['-nostdin','-hide_banner','-loglevel','error','-y',
    '-f','lavfi','-i','sine=frequency=' + tone + ':duration=7',
    '-c:a','libmp3lame','-q:a','5',file], { encoding: 'utf8' });
  if (proc.status !== 0) throw new Error('ffmpeg: ' + proc.stderr);
  files.push(file);
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 800 } });
const log = [];
page.on('console', m => log.push('console:' + m.type() + ':' + m.text()));
page.on('pageerror', e => log.push('pageerror:' + String(e)));
page.on('requestfailed', r => log.push('requestfailed:' + r.url() + ' :: ' + r.failure()?.errorText));
await page.addInitScript(() => {
  const NativeAudio = window.Audio;
  window.__fmQA = { objects: [], errors: [], csp: [] };
  window.addEventListener('securitypolicyviolation', (event) => {
    window.__fmQA.csp.push({ directive: event.effectiveDirective, url: event.blockedURI });
  });
  window.Audio = function(source) {
    const a = new NativeAudio(source);
    window.__fmQA.objects.push(a);
    a.addEventListener('error', () => window.__fmQA.errors.push({
      type: 'media', code: a.error?.code, message: a.error?.message,
      src: a.currentSrc.substring(0, 80), ready: a.readyState, network: a.networkState,
    }));
    return a;
  };
});
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const serverCsp = await page.evaluate(async () => {
    const response = await fetch(location.pathname + '?fm-qa=' + Date.now(), { cache: 'no-store' });
    return response.headers.get('content-security-policy');
  });
  await page.locator('.beyond-music-launcher').click({ timeout: 20000 });
  await page.locator('.beyond-fm-hidden-input').setInputFiles(files);
  await page.waitForTimeout(5500);
  const qa = await page.evaluate(() => ({
    status: document.querySelector('.beyond-music-track em')?.textContent,
    clock: document.querySelector('.beyond-fm-timeline')?.textContent,
    hint: [...document.querySelectorAll('.beyond-fm-import-hint')].map(x=>x.textContent),
    audio: window.__fmQA.objects.map(a=>({
      currentTime: a.currentTime, paused: a.paused,
      readyState: a.readyState, networkState: a.networkState,
      errorCode: a.error?.code, errorMessage: a.error?.message,
      currentSrc: a.currentSrc.substring(0, 80),
    })),
    errors: window.__fmQA.errors, csp: window.__fmQA.csp,
  }));
  console.log('SERVER_CSP', serverCsp);
  console.log('PAGE_QA', JSON.stringify(qa));
  console.log('BROWSER_LOG', log.join('\n'));
  if (!serverCsp?.includes("media-src 'self' blob:;")) throw new Error('LIVE_CSP_MISMATCH');
  if (!qa.audio.some(a => a.currentTime >= 1 && !a.paused && !a.errorCode)) throw new Error('LIVE_MP3_DID_NOT_PLAY');
  console.log('PASS: live URL imported and played a real MP3');
} finally {
  await browser.close();
  rmSync(tmp, { recursive:true, force:true });
}
