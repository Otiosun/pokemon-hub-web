import { useState } from 'react';
import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import { getStarterVisual } from '../../visual-assets/starterManifest';
import { demoCharmander, type PokemonDetailView } from './pokemonDetailMock';

// Fire symbol adapted from partywhale/pokemon-type-icons (MIT). See DESIGN-002 provenance notes.
const firePath =
  'M101.14,196.71c-18.04-4.97-32.15-33.23-26.12-56.44,2.47-9.5,6.73-18.04,13.15-25.42,5.67-6.52,11.56-12.86,17.44-19.19,16.45-17.72,16.84-21.84,3.67-40.92,16.66-6.33,35.79,6.81,36.26,24.87,.23,8.92-3.12,16.84-6.55,24.78-2.86,6.61-3.94,13.22,1.46,21.46,.78-7.78,.25-13.98,5.16-19.12,5.44-5.7,9.99-7.61,18.26-5.74-8,6.58-6.97,10.9,6.52,29.92,12.34,17.41,15.7,32.35,6.6,48.54-9.75,17.35-30.86,27.88-50.31,24.97,1.32-2.15,5-3.89,7.7-5.48,12.95-7.61,14.91-19.54,4.94-30.71-3.31-3.71-7.06-7.04-10.68-10.47-14.71-13.95-16.33-16.83-20.12-36.25-20.01,10.96-23.87,46.75-7.38,75.23Z';

const fieldDexStyles = String.raw`
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

.fdx-page {
  --dex-red: #d8323f;
  --dex-red-dark: #9d1f2b;
  --dex-ink: #121719;
  --dex-ink-soft: #232b2e;
  --dex-screen: #182226;
  --dex-screen-line: rgba(190, 229, 232, .14);
  --dex-paper: #f3f2ea;
  --dex-paper-2: #e8e7de;
  --dex-text: #172024;
  --dex-muted: #697277;
  --dex-line: rgba(23, 32, 36, .13);
  --dex-cyan: #8de7eb;
  --dex-blue: #48c6ee;
  --dex-yellow: #ffd35c;
  --dex-green: #78c88c;
  --type-fire: #e4613e;
  min-height: 100svh;
  padding: clamp(10px, 2vw, 24px);
  color: var(--dex-text);
  background:
    radial-gradient(circle at 12% 8%, rgba(74, 94, 101, .18), transparent 30%),
    #0d1113;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
}

.fdx-device {
  position: relative;
  width: min(1460px, 100%);
  min-height: calc(100svh - clamp(20px, 4vw, 48px));
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 30px;
  background: var(--dex-red);
  box-shadow: 0 34px 90px rgba(0,0,0,.42), inset 0 1px rgba(255,255,255,.15);
}

.fdx-device::before,
.fdx-device::after {
  content: '';
  position: absolute;
  z-index: 20;
  top: 88px;
  bottom: 0;
  width: 9px;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,.16), transparent 16%, rgba(0,0,0,.17));
}
.fdx-device::before { left: 0; }
.fdx-device::after { right: 0; }

.fdx-header {
  position: relative;
  z-index: 10;
  min-height: 88px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  padding: 14px clamp(18px, 2.4vw, 34px);
  color: #fff;
  border-bottom: 1px solid rgba(53, 0, 8, .3);
  background: linear-gradient(180deg, #e33d49, #cf2e3b);
  box-shadow: inset 0 -1px rgba(255,255,255,.12);
}

.fdx-brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
.fdx-lens {
  position: relative;
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border: 5px solid #eef6f5;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #d9ffff 0 8%, #63e6f3 10% 28%, #168db8 56%, #0a5677 78%);
  box-shadow: 0 0 0 2px rgba(0,0,0,.18), 0 0 22px rgba(94,225,242,.28);
}
.fdx-lens::after { content:''; position:absolute; inset:9px; border-radius:50%; border:1px solid rgba(255,255,255,.4); }
.fdx-brand-copy { min-width: 0; }
.fdx-brand-copy strong {
  display:block;
  font-family:'Space Grotesk',sans-serif;
  font-size:.98rem;
  letter-spacing:.08em;
}
.fdx-brand-copy span,
.fdx-progress span,
.fdx-code,
.fdx-micro,
.fdx-label {
  font-family:'IBM Plex Mono',monospace;
  text-transform:uppercase;
  letter-spacing:.11em;
}
.fdx-brand-copy span { display:block; margin-top:2px; font-size:.58rem; color:rgba(255,255,255,.66); }

.fdx-header-lights { display:flex; gap:7px; margin-left:6px; }
.fdx-light { width:8px; height:8px; border-radius:50%; box-shadow:0 0 0 1px rgba(0,0,0,.16); }
.fdx-light--red { background:#ff7b77; }
.fdx-light--yellow { background:#ffe178; }
.fdx-light--green { background:#8de19b; }

.fdx-progress { text-align:center; }
.fdx-progress span { display:block; color:rgba(255,255,255,.62); font-size:.56rem; }
.fdx-progress strong { display:block; margin-top:2px; font:600 .86rem 'IBM Plex Mono',monospace; }

.fdx-tools { justify-self:end; display:flex; gap:8px; }
.fdx-icon-button,
.fdx-nav-button,
.fdx-tab {
  appearance:none;
  border:0;
  font:inherit;
  cursor:pointer;
}
.fdx-icon-button {
  width:44px;
  height:44px;
  display:grid;
  place-items:center;
  border:1px solid rgba(255,255,255,.18);
  border-radius:13px;
  color:#fff;
  background:rgba(68,0,9,.14);
}
.fdx-icon-button svg { width:19px; height:19px; }
.fdx-icon-button:hover { background:rgba(68,0,9,.26); }

.fdx-workspace {
  display:grid;
  grid-template-columns:minmax(0, 1.45fr) minmax(370px, .72fr);
  min-height:calc(100svh - 136px);
  margin: 12px;
  overflow:hidden;
  border-radius:20px;
  background:var(--dex-screen);
  box-shadow:0 12px 30px rgba(71,0,9,.22);
}

.fdx-specimen {
  position:relative;
  min-width:0;
  min-height:680px;
  overflow:hidden;
  color:#eaf9f8;
  background:
    linear-gradient(var(--dex-screen-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--dex-screen-line) 1px, transparent 1px),
    radial-gradient(circle at 50% 48%, rgba(71,150,157,.17), transparent 34%),
    linear-gradient(145deg, #1b282c, #11191c 70%);
  background-size:38px 38px,38px 38px,auto,auto;
}

.fdx-specimen::after {
  content:'';
  position:absolute;
  z-index:4;
  left:0;
  right:0;
  top:18%;
  height:1px;
  opacity:.55;
  pointer-events:none;
  background:linear-gradient(90deg, transparent, var(--dex-cyan), transparent);
  box-shadow:0 0 12px rgba(141,231,235,.65);
  animation:fdx-scan 5.5s ease-in-out infinite;
}
@keyframes fdx-scan { 0%,100%{ transform:translateY(0); opacity:.2; } 50%{ transform:translateY(340px); opacity:.68; } }

.fdx-screen-corners { position:absolute; z-index:5; inset:22px; pointer-events:none; }
.fdx-screen-corners i { position:absolute; width:34px; height:34px; opacity:.65; }
.fdx-screen-corners i:nth-child(1){left:0;top:0;border-left:1px solid var(--dex-cyan);border-top:1px solid var(--dex-cyan);}
.fdx-screen-corners i:nth-child(2){right:0;top:0;border-right:1px solid var(--dex-cyan);border-top:1px solid var(--dex-cyan);}
.fdx-screen-corners i:nth-child(3){left:0;bottom:0;border-left:1px solid var(--dex-cyan);border-bottom:1px solid var(--dex-cyan);}
.fdx-screen-corners i:nth-child(4){right:0;bottom:0;border-right:1px solid var(--dex-cyan);border-bottom:1px solid var(--dex-cyan);}

.fdx-specimen-top {
  position:absolute;
  z-index:7;
  top:26px;
  left:30px;
  right:30px;
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
  pointer-events:none;
}
.fdx-code { font-size:.68rem; color:rgba(222,246,246,.65); }
.fdx-register-state { display:flex; align-items:center; gap:8px; }
.fdx-status-dot { width:7px; height:7px; border-radius:50%; background:var(--dex-green); box-shadow:0 0 12px rgba(120,200,140,.55); }
.fdx-register-state strong { font:600 .66rem 'IBM Plex Mono',monospace; letter-spacing:.08em; }

.fdx-artwork {
  position:absolute;
  z-index:1;
  left:50%;
  top:50%;
  width:min(68%, 590px);
  max-height:72%;
  object-fit:contain;
  transform:translate(-50%,-50%);
  filter:saturate(.78) brightness(1.04) drop-shadow(0 30px 60px rgba(0,0,0,.3));
  opacity:.68;
  pointer-events:none;
  animation:fdx-artwork-fade 900ms ease 1.35s forwards;
}
@keyframes fdx-artwork-fade { to { opacity:.08; filter:saturate(.4) brightness(.9); } }

.fdx-viewer {
  position:absolute;
  z-index:3;
  inset:70px 6% 92px;
}
.fdx-viewer .generations-demo,
.fdx-viewer .generations-viewer-shell,
.fdx-viewer .generations-host {
  width:100%;
  height:100%;
  min-height:0;
  border:0;
  border-radius:0;
  background:transparent;
  box-shadow:none;
}
.fdx-viewer .generations-status { display:none; }
.fdx-viewer .generations-loading {
  left:50%;
  bottom:24px;
  transform:translateX(-50%);
  color:#cde3e3;
  background:rgba(5,11,13,.62);
  border:1px solid rgba(141,231,235,.16);
  backdrop-filter:blur(10px);
}

.fdx-height-ruler {
  position:absolute;
  z-index:4;
  left:28px;
  top:112px;
  bottom:106px;
  width:20px;
  border-left:1px solid rgba(192,229,231,.24);
  background:repeating-linear-gradient(180deg, transparent 0 18px, rgba(192,229,231,.22) 18px 19px);
  pointer-events:none;
}
.fdx-height-ruler span { position:absolute; left:7px; bottom:-2px; font:500 .52rem 'IBM Plex Mono',monospace; color:rgba(220,241,241,.45); writing-mode:vertical-rl; }

.fdx-specimen-bottom {
  position:absolute;
  z-index:7;
  left:30px;
  right:30px;
  bottom:25px;
  display:grid;
  grid-template-columns:auto 1fr auto;
  align-items:end;
  gap:20px;
  pointer-events:none;
}
.fdx-dex-number { font:600 .78rem 'IBM Plex Mono',monospace; color:var(--dex-cyan); }
.fdx-name-block h1 { margin:0; font:700 clamp(2.6rem,5vw,5.5rem)/.88 'Space Grotesk',sans-serif; letter-spacing:-.055em; }
.fdx-name-meta { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-top:12px; }
.fdx-type-chip { display:inline-flex; align-items:center; gap:8px; padding:6px 10px 6px 7px; border-radius:99px; color:#fff; background:rgba(228,97,62,.16); border:1px solid rgba(228,97,62,.3); font-size:.68rem; font-weight:700; }
.fdx-type-icon { width:23px; height:23px; flex:0 0 auto; color:var(--type-fire); }
.fdx-sex { font:600 .78rem 'IBM Plex Mono',monospace; color:#83d5ff; }
.fdx-view-hint { text-align:right; color:rgba(226,246,246,.48); font:500 .58rem/1.5 'IBM Plex Mono',monospace; letter-spacing:.04em; }

.fdx-panel {
  position:relative;
  z-index:8;
  min-width:0;
  color:var(--dex-text);
  background:var(--dex-paper);
  border-left:1px solid rgba(255,255,255,.06);
}
.fdx-panel::before { content:''; position:absolute; left:0; top:0; bottom:0; width:1px; background:rgba(0,0,0,.09); }

.fdx-tabs { display:grid; grid-template-columns:1fr 1fr; min-height:62px; border-bottom:1px solid var(--dex-line); }
.fdx-tab { position:relative; color:var(--dex-muted); background:transparent; font:600 .7rem 'IBM Plex Mono',monospace; letter-spacing:.08em; text-transform:uppercase; }
.fdx-tab[aria-selected='true'] { color:var(--dex-text); }
.fdx-tab[aria-selected='true']::after { content:''; position:absolute; left:22%; right:22%; bottom:-1px; height:3px; border-radius:3px 3px 0 0; background:var(--dex-red); }
.fdx-tab + .fdx-tab { border-left:1px solid var(--dex-line); }

.fdx-panel-content { min-height:618px; padding:clamp(24px,3.2vw,42px); }
.fdx-panel-kicker { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:30px; }
.fdx-label { color:var(--dex-muted); font-size:.59rem; }
.fdx-record-id { color:var(--dex-red); font:600 .62rem 'IBM Plex Mono',monospace; }
.fdx-panel h2 { margin:0; font:700 clamp(2rem,3vw,3.3rem)/.95 'Space Grotesk',sans-serif; letter-spacing:-.045em; }
.fdx-description { margin:20px 0 28px; color:#414a4e; font-size:.98rem; line-height:1.66; }

.fdx-facts { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid var(--dex-line); border-bottom:1px solid var(--dex-line); }
.fdx-fact { min-height:82px; display:flex; flex-direction:column; justify-content:center; gap:7px; padding:14px 0; }
.fdx-fact:nth-child(odd) { padding-right:18px; border-right:1px solid var(--dex-line); }
.fdx-fact:nth-child(even) { padding-left:18px; }
.fdx-fact:nth-child(-n+2) { border-bottom:1px solid var(--dex-line); }
.fdx-fact strong { font-family:'Space Grotesk',sans-serif; font-size:.95rem; }

.fdx-research { margin-top:28px; padding:18px; border-radius:14px; color:#dcecec; background:#202a2d; }
.fdx-research-head { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:12px; }
.fdx-research-head strong { font:600 .67rem 'IBM Plex Mono',monospace; letter-spacing:.06em; }
.fdx-research-head span { color:#9db2b5; font:500 .6rem 'IBM Plex Mono',monospace; }
.fdx-research-track { height:4px; overflow:hidden; border-radius:99px; background:rgba(255,255,255,.09); }
.fdx-research-fill { width:72%; height:100%; border-radius:inherit; background:linear-gradient(90deg,var(--dex-cyan),#c9f6db); }
.fdx-research-note { margin:11px 0 0; color:#92a5a8; font-size:.72rem; line-height:1.45; }

.fdx-vitals { display:grid; grid-template-columns:88px 1fr; gap:18px; align-items:center; margin:22px 0 24px; padding-bottom:24px; border-bottom:1px solid var(--dex-line); }
.fdx-level { display:grid; place-items:center; width:82px; height:82px; border-radius:50%; color:#fff; background:var(--dex-red); box-shadow:inset 0 0 0 6px rgba(255,255,255,.1); }
.fdx-level span { font:500 .52rem 'IBM Plex Mono',monospace; letter-spacing:.08em; }
.fdx-level strong { font:700 1.7rem 'Space Grotesk',sans-serif; line-height:1; }
.fdx-bars { display:grid; gap:12px; }
.fdx-bar-row { display:grid; grid-template-columns:28px 1fr auto; gap:9px; align-items:center; }
.fdx-bar-row > span { font:600 .58rem 'IBM Plex Mono',monospace; color:var(--dex-muted); }
.fdx-bar-row strong { font:600 .65rem 'IBM Plex Mono',monospace; }
.fdx-bar { height:5px; overflow:hidden; border-radius:99px; background:#d7d7cf; }
.fdx-bar i { display:block; height:100%; border-radius:inherit; background:var(--dex-green); }
.fdx-bar--xp i { background:var(--dex-blue); }

.fdx-traits { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:24px; }
.fdx-trait { padding:13px 14px; border:1px solid var(--dex-line); border-radius:12px; background:rgba(255,255,255,.42); }
.fdx-trait strong { display:block; margin-top:5px; font-size:.86rem; }

.fdx-moves-title { display:flex; justify-content:space-between; align-items:center; margin-bottom:9px; }
.fdx-moves-title strong { font:600 .69rem 'IBM Plex Mono',monospace; letter-spacing:.06em; }
.fdx-moves { border-top:1px solid var(--dex-line); }
.fdx-move { display:grid; grid-template-columns:1fr auto; gap:16px; align-items:center; min-height:58px; border-bottom:1px solid var(--dex-line); }
.fdx-move-main { display:flex; align-items:center; gap:9px; min-width:0; }
.fdx-move-type-dot { width:7px; height:7px; flex:0 0 auto; border-radius:50%; background:#a7aaa5; }
.fdx-move-type-dot--fire { background:var(--type-fire); box-shadow:0 0 0 4px rgba(228,97,62,.09); }
.fdx-move-main strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.84rem; }
.fdx-move-main span { color:var(--dex-muted); font-size:.66rem; }
.fdx-move-pp { text-align:right; font:600 .66rem 'IBM Plex Mono',monospace; }

.fdx-origin { display:grid; grid-template-columns:auto 1fr; gap:12px; margin-top:20px; padding:14px; border-radius:12px; background:var(--dex-paper-2); }
.fdx-ball { width:32px; height:32px; border:2px solid var(--dex-text); border-radius:50%; position:relative; align-self:center; }
.fdx-ball::before { content:''; position:absolute; left:-2px; right:-2px; top:13px; border-top:2px solid var(--dex-text); }
.fdx-ball::after { content:''; position:absolute; left:9px; top:9px; width:10px; height:10px; border:2px solid var(--dex-text); border-radius:50%; background:var(--dex-paper-2); }
.fdx-origin strong { display:block; font-size:.78rem; }
.fdx-origin span { display:block; margin-top:3px; color:var(--dex-muted); font-size:.65rem; }

.fdx-navigator {
  position:absolute;
  z-index:12;
  left:34px;
  right:calc(28% + 34px);
  bottom:16px;
  display:flex;
  justify-content:space-between;
  pointer-events:none;
}
.fdx-nav-button { min-width:44px; min-height:44px; display:flex; align-items:center; gap:8px; padding:8px 11px; color:rgba(230,245,245,.72); background:rgba(7,12,14,.42); border:1px solid rgba(199,229,230,.14); border-radius:12px; backdrop-filter:blur(8px); pointer-events:auto; }
.fdx-nav-button:disabled { opacity:.6; cursor:not-allowed; }
.fdx-nav-button svg { width:16px; height:16px; }
.fdx-nav-copy { display:grid; text-align:left; }
.fdx-nav-copy small { color:rgba(226,246,246,.42); font:500 .48rem 'IBM Plex Mono',monospace; }
.fdx-nav-copy strong { font-size:.66rem; }

@container fdx-panel (max-width: 430px) {
  .fdx-panel-content { padding-inline:22px; }
  .fdx-facts { grid-template-columns:1fr; }
  .fdx-fact:nth-child(n) { padding:13px 0; border-right:0; border-bottom:1px solid var(--dex-line); }
  .fdx-fact:last-child { border-bottom:0; }
}

.fdx-panel { container:fdx-panel / inline-size; }

@media (max-width: 900px) {
  .fdx-page { padding:0; }
  .fdx-device { min-height:100svh; border-radius:0; border:0; }
  .fdx-device::before,.fdx-device::after { display:none; }
  .fdx-header { min-height:72px; grid-template-columns:1fr auto; padding:10px 14px; }
  .fdx-lens { width:40px; height:40px; border-width:4px; }
  .fdx-brand { gap:10px; }
  .fdx-header-lights,.fdx-progress { display:none; }
  .fdx-workspace { display:block; min-height:calc(100svh - 72px); margin:0; border-radius:0; overflow:visible; background:var(--dex-paper); }
  .fdx-specimen { min-height:52svh; height:52svh; }
  .fdx-specimen-top { top:18px; left:18px; right:18px; }
  .fdx-viewer { inset:54px 0 78px; }
  .fdx-artwork { width:min(74%,430px); max-height:72%; }
  .fdx-height-ruler { left:17px; top:80px; bottom:84px; opacity:.65; }
  .fdx-specimen-bottom { left:18px; right:18px; bottom:17px; grid-template-columns:auto 1fr; gap:12px; }
  .fdx-name-block h1 { font-size:clamp(2.55rem,12vw,4.5rem); }
  .fdx-view-hint { display:none; }
  .fdx-panel { margin-top:-1px; border-left:0; border-radius:24px 24px 0 0; overflow:hidden; box-shadow:0 -14px 32px rgba(0,0,0,.16); }
  .fdx-panel-content { min-height:0; padding:26px 20px calc(34px + env(safe-area-inset-bottom)); }
  .fdx-tabs { min-height:58px; }
  .fdx-navigator { position:absolute; left:12px; right:12px; top:calc(52svh - 58px); bottom:auto; }
  .fdx-nav-copy { display:none; }
  .fdx-nav-button { width:44px; min-width:44px; justify-content:center; border-radius:50%; padding:0; }
}

@media (max-width: 430px) {
  .fdx-brand-copy span { display:none; }
  .fdx-brand-copy strong { font-size:.8rem; }
  .fdx-tools .fdx-icon-button:first-child { display:none; }
  .fdx-name-meta { margin-top:8px; }
  .fdx-type-chip { padding-right:8px; font-size:.61rem; }
  .fdx-sex { font-size:.7rem; }
  .fdx-specimen { height:49svh; min-height:390px; }
  .fdx-navigator { top:calc(49svh - 58px); }
}

@media (prefers-reduced-motion: reduce) {
  .fdx-specimen::after,.fdx-artwork { animation:none; }
  .fdx-artwork { opacity:.1; }
}
`;

type TabId = 'record' | 'owned';

function Icon({ name }: { name: 'arrow' | 'search' | 'grid' | 'chevron-left' | 'chevron-right' }) {
  if (name === 'search') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
  }
  if (name === 'grid') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
  }
  if (name === 'chevron-left') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="m15 18-6-6 6-6"/></svg>;
  }
  if (name === 'chevron-right') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="m9 18 6-6-6-6"/></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 12H5m6-6-6 6 6 6"/></svg>;
}

function FireTypeIcon() {
  return (
    <svg className="fdx-type-icon" aria-hidden="true" viewBox="0 0 256 256">
      <circle cx="128" cy="128" r="128" fill="currentColor" />
      <path d={firePath} fill="#fff" />
    </svg>
  );
}

function Header() {
  return (
    <header className="fdx-header">
      <div className="fdx-brand">
        <div className="fdx-lens" aria-hidden="true" />
        <div className="fdx-header-lights" aria-hidden="true">
          <i className="fdx-light fdx-light--red" />
          <i className="fdx-light fdx-light--yellow" />
          <i className="fdx-light fdx-light--green" />
        </div>
        <div className="fdx-brand-copy">
          <strong>FIELD DEX</strong>
          <span>KANTO RESEARCH SYSTEM // V.01</span>
        </div>
      </div>

      <div className="fdx-progress" aria-label="Progresso da Pokédex Nacional">
        <span>NATIONAL DEX</span>
        <strong>004 / 386</strong>
      </div>

      <div className="fdx-tools">
        <button className="fdx-icon-button" type="button" aria-label="Pesquisar na Pokédex" disabled>
          <Icon name="search" />
        </button>
        <a className="fdx-icon-button" href="/" aria-label="Voltar ao Hub">
          <Icon name="grid" />
        </a>
      </div>
    </header>
  );
}

function SpecimenScreen({ pokemon }: { pokemon: PokemonDetailView }) {
  const visual = getStarterVisual(4);
  const displayName = pokemon.nickname || pokemon.species;
  const sex = pokemon.sex === 'male' ? '♂' : pokemon.sex === 'female' ? '♀' : '—';

  return (
    <section className="fdx-specimen" aria-labelledby="fdx-pokemon-name">
      <div className="fdx-screen-corners" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="fdx-height-ruler" aria-hidden="true"><span>0.60 M // SCALE</span></div>

      <div className="fdx-specimen-top">
        <div className="fdx-code">DEX//KNT-{String(pokemon.speciesId).padStart(3, '0')} · SPECIMEN</div>
        <div className="fdx-register-state"><i className="fdx-status-dot"/><strong>CAPTURADO</strong></div>
      </div>

      <img
        className="fdx-artwork"
        src={visual.artworkHome.url}
        alt=""
        aria-hidden="true"
        decoding="async"
      />

      <div className="fdx-viewer">
        <GenerationsPokemonViewer species={pokemon.species.toLowerCase()} name={pokemon.species} />
      </div>

      <div className="fdx-specimen-bottom">
        <span className="fdx-dex-number">#{String(pokemon.speciesId).padStart(3, '0')}</span>
        <div className="fdx-name-block">
          <h1 id="fdx-pokemon-name">{displayName}</h1>
          <div className="fdx-name-meta">
            <span className="fdx-type-chip"><FireTypeIcon /> FOGO</span>
            <span className="fdx-sex" aria-label={pokemon.sex === 'male' ? 'Macho' : 'Fêmea'}>{sex}</span>
          </div>
        </div>
        <span className="fdx-view-hint">DRAG // ROTATE<br/>PINCH // ZOOM</span>
      </div>
    </section>
  );
}

function RecordPanel() {
  return (
    <div id="fdx-record-panel" role="tabpanel" aria-labelledby="fdx-record-tab">
      <div className="fdx-panel-kicker"><span className="fdx-label">REGISTRO DA ESPÉCIE</span><span className="fdx-record-id">ENTRY 004</span></div>
      <h2>Pokémon Lagarto</h2>
      <p className="fdx-description">
        A chama na ponta de sua cauda demonstra sua força vital. Desde o nascimento, a chama permanece acesa e reage ao seu estado.
      </p>

      <div className="fdx-facts">
        <div className="fdx-fact"><span className="fdx-label">TIPO</span><strong>Fogo</strong></div>
        <div className="fdx-fact"><span className="fdx-label">REGIÃO</span><strong>Kanto</strong></div>
        <div className="fdx-fact"><span className="fdx-label">ALTURA</span><strong>0,6 m</strong></div>
        <div className="fdx-fact"><span className="fdx-label">PESO</span><strong>8,5 kg</strong></div>
      </div>

      <div className="fdx-research">
        <div className="fdx-research-head"><strong>FIELD RESEARCH</strong><span>REGISTRADO</span></div>
        <div className="fdx-research-track" aria-hidden="true"><div className="fdx-research-fill"/></div>
        <p className="fdx-research-note">Espécie vista e capturada. Novos registros de campo podem ampliar este arquivo no RPG.</p>
      </div>
    </div>
  );
}

function OwnedPanel({ pokemon }: { pokemon: PokemonDetailView }) {
  const hpPercent = Math.round((pokemon.hp.current / pokemon.hp.max) * 100);
  const xpPercent = Math.round((pokemon.xp.current / pokemon.xp.nextLevel) * 100);

  return (
    <div id="fdx-owned-panel" role="tabpanel" aria-labelledby="fdx-owned-tab">
      <div className="fdx-panel-kicker"><span className="fdx-label">MEU POKÉMON</span><span className="fdx-record-id">INSTANCE // 004-A</span></div>
      <h2>Seu parceiro</h2>

      <div className="fdx-vitals">
        <div className="fdx-level"><span>NÍVEL</span><strong>{pokemon.level}</strong></div>
        <div className="fdx-bars">
          <div className="fdx-bar-row"><span>HP</span><div className="fdx-bar"><i style={{ width: `${hpPercent}%` }}/></div><strong>{pokemon.hp.current}/{pokemon.hp.max}</strong></div>
          <div className="fdx-bar-row"><span>XP</span><div className="fdx-bar fdx-bar--xp"><i style={{ width: `${xpPercent}%` }}/></div><strong>{xpPercent}%</strong></div>
        </div>
      </div>

      <div className="fdx-traits">
        <div className="fdx-trait"><span className="fdx-label">NATURE</span><strong>{pokemon.nature}</strong></div>
        <div className="fdx-trait"><span className="fdx-label">ABILITY</span><strong>{pokemon.ability}</strong></div>
      </div>

      <div className="fdx-moves-title"><strong>MOVE SET</strong><span className="fdx-label">PP ATUAL</span></div>
      <div className="fdx-moves">
        {pokemon.moves.map((move) => (
          <div className="fdx-move" key={move.name}>
            <div className="fdx-move-main">
              <i className={`fdx-move-type-dot ${move.type === 'Fogo' ? 'fdx-move-type-dot--fire' : ''}`} aria-hidden="true"/>
              <strong>{move.name}</strong>
              <span>{move.type}</span>
            </div>
            <span className="fdx-move-pp">{move.pp.current}/{move.pp.max}</span>
          </div>
        ))}
      </div>

      <div className="fdx-origin">
        <div className="fdx-ball" aria-hidden="true"/>
        <div><strong>{pokemon.capture.location}</strong><span>{pokemon.capture.dateLabel} · {pokemon.capture.ball}</span></div>
      </div>
    </div>
  );
}

function DataPanel({ pokemon }: { pokemon: PokemonDetailView }) {
  const [tab, setTab] = useState<TabId>('record');
  return (
    <aside className="fdx-panel" aria-label="Dados da Pokédex">
      <div className="fdx-tabs" role="tablist" aria-label="Modo de consulta">
        <button id="fdx-record-tab" className="fdx-tab" type="button" role="tab" aria-selected={tab === 'record'} aria-controls="fdx-record-panel" onClick={() => setTab('record')}>REGISTRO</button>
        <button id="fdx-owned-tab" className="fdx-tab" type="button" role="tab" aria-selected={tab === 'owned'} aria-controls="fdx-owned-panel" onClick={() => setTab('owned')}>MEU POKÉMON</button>
      </div>
      <div className="fdx-panel-content">{tab === 'record' ? <RecordPanel /> : <OwnedPanel pokemon={pokemon} />}</div>
    </aside>
  );
}

function Navigator() {
  return (
    <nav className="fdx-navigator" aria-label="Navegação entre espécies">
      <button className="fdx-nav-button" type="button" disabled aria-label="Pokémon anterior: Venusaur, número 003">
        <Icon name="chevron-left"/><span className="fdx-nav-copy"><small>#003</small><strong>Venusaur</strong></span>
      </button>
      <button className="fdx-nav-button" type="button" disabled aria-label="Próximo Pokémon: Charmeleon, número 005">
        <span className="fdx-nav-copy"><small>#005</small><strong>Charmeleon</strong></span><Icon name="chevron-right"/>
      </button>
    </nav>
  );
}

export function PokemonDetailPage() {
  return (
    <main className="fdx-page">
      <style>{fieldDexStyles}</style>
      <section className="fdx-device" aria-label="Field Dex — protótipo de Pokédex">
        <Header />
        <div className="fdx-workspace">
          <SpecimenScreen pokemon={demoCharmander}/>
          <DataPanel pokemon={demoCharmander}/>
        </div>
        <Navigator />
      </section>
    </main>
  );
}
