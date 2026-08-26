import { useState } from 'react';
import { getStarterVisual } from '../../visual-assets/starterManifest';
import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import { demoCharmander, type PokemonDetailView } from './pokemonDetailMock';

// Fire symbol adapted from partywhale/pokemon-type-icons (MIT).
const FIRE_PATH =
  'M101.14,196.71c-18.04-4.97-32.15-33.23-26.12-56.44,2.47-9.5,6.73-18.04,13.15-25.42,5.67-6.52,11.56-12.86,17.44-19.19,16.45-17.72,16.84-21.84,3.67-40.92,16.66-6.33,35.79,6.81,36.26,24.87,.23,8.92-3.12,16.84-6.55,24.78-2.86,6.61-3.94,13.22,1.46,21.46,.78-7.78,.25-13.98,5.16-19.12,5.44-5.7,9.99-7.61,18.26-5.74-8,6.58-6.97,10.9,6.52,29.92,12.34,17.41,15.7,32.35,6.6,48.54-9.75,17.35-30.86,27.88-50.31,24.97,1.32-2.15,5-3.89,7.7-5.48,12.95-7.61,14.91-19.54,4.94-30.71-3.31-3.71-7.06-7.04-10.68-10.47-14.71-13.95-16.33-16.83-20.12-36.25-20.01,10.96-23.87,46.75-7.38,75.23Z';

const styles = String.raw`
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

.dex-page{--red:#d8323f;--red2:#a51f2c;--ink:#172024;--screen:#162125;--paper:#f3f2ea;--paper2:#e7e6dd;--muted:#70797d;--line:rgba(23,32,36,.13);--cyan:#8de7eb;--blue:#48c6ee;--green:#78c88c;--fire:#e4613e;min-height:100svh;padding:clamp(10px,2vw,24px);background:radial-gradient(circle at 10% 5%,#243137 0,transparent 30%),#0d1113;color:var(--ink);font-family:'IBM Plex Sans',system-ui,sans-serif}
.dex-shell{position:relative;width:min(1460px,100%);min-height:calc(100svh - clamp(20px,4vw,48px));margin:auto;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:30px;background:var(--red);box-shadow:0 34px 90px rgba(0,0,0,.42)}
.dex-header{min-height:86px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:12px clamp(18px,2.4vw,34px);color:#fff;background:linear-gradient(#e4404c,#cc2d3a);border-bottom:1px solid rgba(70,0,9,.28)}
.dex-brand{display:flex;align-items:center;gap:12px;min-width:0}.dex-lens{width:46px;height:46px;flex:none;border:5px solid #edf7f6;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e8ffff 0 8%,#67eaf4 10% 29%,#188fb9 56%,#0b5574 78%);box-shadow:0 0 0 2px rgba(0,0,0,.16),0 0 20px rgba(91,226,242,.28)}
.dex-lights{display:flex;gap:6px}.dex-lights span{width:8px;height:8px;border-radius:50%}.dex-lights span:nth-child(1){background:#ff7775}.dex-lights span:nth-child(2){background:#ffe079}.dex-lights span:nth-child(3){background:#8de29b}
.dex-title strong{display:block;font:700 .96rem 'Space Grotesk',sans-serif;letter-spacing:.08em}.dex-title small,.dex-progress small,.dex-code,.dex-label{font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.1em}.dex-title small{display:block;margin-top:2px;color:rgba(255,255,255,.64);font-size:.56rem}.dex-progress{text-align:center}.dex-progress small{display:block;color:rgba(255,255,255,.62);font-size:.54rem}.dex-progress strong{font:600 .86rem 'IBM Plex Mono',monospace}
.dex-tools{justify-self:end;display:flex;gap:8px}.dex-icon{width:44px;height:44px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:13px;color:#fff;background:rgba(70,0,9,.14);text-decoration:none}.dex-icon svg{width:19px;height:19px}
.dex-body{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(370px,.72fr);min-height:calc(100svh - 134px);margin:12px;overflow:hidden;border-radius:20px;background:var(--screen);box-shadow:0 12px 30px rgba(71,0,9,.23)}
.dex-stage{position:relative;min-height:680px;overflow:hidden;color:#e9f7f7;background:linear-gradient(rgba(190,229,232,.11) 1px,transparent 1px),linear-gradient(90deg,rgba(190,229,232,.11) 1px,transparent 1px),radial-gradient(circle at 50% 50%,rgba(70,150,157,.18),transparent 35%),linear-gradient(145deg,#1b282c,#11191c 70%);background-size:38px 38px,38px 38px,auto,auto}
.dex-stage:after{content:'';position:absolute;z-index:4;left:0;right:0;top:20%;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);box-shadow:0 0 12px rgba(141,231,235,.55);animation:scan 5.5s ease-in-out infinite;pointer-events:none}@keyframes scan{0%,100%{transform:translateY(0);opacity:.2}50%{transform:translateY(340px);opacity:.7}}
.dex-corners{position:absolute;z-index:5;inset:22px;pointer-events:none}.dex-corners span{position:absolute;width:34px;height:34px;opacity:.65}.dex-corners span:nth-child(1){left:0;top:0;border-left:1px solid var(--cyan);border-top:1px solid var(--cyan)}.dex-corners span:nth-child(2){right:0;top:0;border-right:1px solid var(--cyan);border-top:1px solid var(--cyan)}.dex-corners span:nth-child(3){left:0;bottom:0;border-left:1px solid var(--cyan);border-bottom:1px solid var(--cyan)}.dex-corners span:nth-child(4){right:0;bottom:0;border-right:1px solid var(--cyan);border-bottom:1px solid var(--cyan)}
.dex-stage-top{position:absolute;z-index:7;top:27px;left:30px;right:30px;display:flex;justify-content:space-between;gap:16px;pointer-events:none}.dex-code{font-size:.65rem;color:rgba(222,246,246,.62)}.dex-state{display:flex;align-items:center;gap:8px;font:600 .64rem 'IBM Plex Mono',monospace;letter-spacing:.07em}.dex-state span{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 12px rgba(120,200,140,.55)}
.dex-art{position:absolute;z-index:1;left:50%;top:50%;width:min(68%,590px);max-height:72%;object-fit:contain;transform:translate(-50%,-50%);opacity:.68;filter:saturate(.8) drop-shadow(0 30px 60px rgba(0,0,0,.28));pointer-events:none;animation:artfade .9s ease 1.35s forwards}@keyframes artfade{to{opacity:.08;filter:saturate(.35) brightness(.85)}}
.dex-viewer{position:absolute;z-index:3;inset:68px 6% 92px}.dex-viewer .generations-demo,.dex-viewer .generations-viewer-shell,.dex-viewer .generations-host{width:100%;height:100%;min-height:0;border:0;border-radius:0;background:transparent;box-shadow:none}.dex-viewer .generations-status{display:none}.dex-viewer .generations-loading{left:50%;bottom:24px;transform:translateX(-50%);color:#cde3e3;background:rgba(5,11,13,.65);border:1px solid rgba(141,231,235,.16);backdrop-filter:blur(10px)}
.dex-ruler{position:absolute;z-index:4;left:28px;top:110px;bottom:106px;width:18px;border-left:1px solid rgba(192,229,231,.24);background:repeating-linear-gradient(180deg,transparent 0 18px,rgba(192,229,231,.21) 18px 19px);pointer-events:none}.dex-ruler small{position:absolute;bottom:0;left:6px;color:rgba(220,241,241,.45);font:500 .5rem 'IBM Plex Mono',monospace;writing-mode:vertical-rl}
.dex-stage-bottom{position:absolute;z-index:7;left:30px;right:30px;bottom:25px;display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:18px;pointer-events:none}.dex-number{color:var(--cyan);font:600 .76rem 'IBM Plex Mono',monospace}.dex-name h1{margin:0;font:700 clamp(2.7rem,5vw,5.6rem)/.88 'Space Grotesk',sans-serif;letter-spacing:-.055em}.dex-meta{display:flex;align-items:center;gap:10px;margin-top:10px}.dex-type{display:inline-flex;align-items:center;gap:7px;padding:5px 10px 5px 6px;border:1px solid rgba(228,97,62,.32);border-radius:99px;background:rgba(228,97,62,.14);font-size:.67rem;font-weight:700}.dex-type svg{width:23px;height:23px;color:var(--fire)}.dex-sex{color:#87d6ff;font:600 .8rem 'IBM Plex Mono',monospace}.dex-hint{text-align:right;color:rgba(226,246,246,.45);font:500 .56rem/1.55 'IBM Plex Mono',monospace;letter-spacing:.04em}
.dex-panel{container:dexpanel / inline-size;position:relative;color:var(--ink);background:var(--paper);border-left:1px solid rgba(255,255,255,.06)}.dex-tabs{display:grid;grid-template-columns:1fr 1fr;min-height:62px;border-bottom:1px solid var(--line)}.dex-tab{position:relative;border:0;background:transparent;color:var(--muted);font:600 .69rem 'IBM Plex Mono',monospace;letter-spacing:.08em;cursor:pointer}.dex-tab+ .dex-tab{border-left:1px solid var(--line)}.dex-tab[aria-selected='true']{color:var(--ink)}.dex-tab[aria-selected='true']:after{content:'';position:absolute;left:22%;right:22%;bottom:-1px;height:3px;background:var(--red);border-radius:3px 3px 0 0}
.dex-content{min-height:618px;padding:clamp(24px,3.2vw,42px)}.dex-kicker{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:28px}.dex-label{color:var(--muted);font-size:.57rem}.dex-entry{color:var(--red);font:600 .61rem 'IBM Plex Mono',monospace}.dex-content h2{margin:0;font:700 clamp(2rem,3vw,3.3rem)/.95 'Space Grotesk',sans-serif;letter-spacing:-.045em}.dex-desc{margin:20px 0 28px;color:#424b4f;font-size:.96rem;line-height:1.65}
.dex-facts{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.dex-fact{min-height:80px;display:flex;flex-direction:column;justify-content:center;gap:6px;padding:13px 0}.dex-fact:nth-child(odd){padding-right:18px;border-right:1px solid var(--line)}.dex-fact:nth-child(even){padding-left:18px}.dex-fact:nth-child(-n+2){border-bottom:1px solid var(--line)}.dex-fact strong{font:600 .94rem 'Space Grotesk',sans-serif}
.dex-research{margin-top:26px;padding:17px;border-radius:14px;color:#dcecec;background:#202a2d}.dex-research-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px;font:600 .64rem 'IBM Plex Mono',monospace;letter-spacing:.05em}.dex-research-head span{color:#9cb1b4}.dex-track{height:4px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden}.dex-track span{display:block;width:72%;height:100%;background:linear-gradient(90deg,var(--cyan),#c9f6db)}.dex-note{margin:10px 0 0;color:#94a7aa;font-size:.71rem;line-height:1.45}
.dex-vitals{display:grid;grid-template-columns:82px 1fr;gap:18px;align-items:center;margin:22px 0 23px;padding-bottom:23px;border-bottom:1px solid var(--line)}.dex-level{display:grid;place-items:center;width:78px;height:78px;border-radius:50%;color:#fff;background:var(--red);box-shadow:inset 0 0 0 6px rgba(255,255,255,.1)}.dex-level small{font:500 .5rem 'IBM Plex Mono',monospace}.dex-level strong{font:700 1.65rem 'Space Grotesk',sans-serif;line-height:1}.dex-bars{display:grid;gap:11px}.dex-bar-row{display:grid;grid-template-columns:27px 1fr auto;gap:8px;align-items:center}.dex-bar-row>span{color:var(--muted);font:600 .56rem 'IBM Plex Mono',monospace}.dex-bar-row strong{font:600 .63rem 'IBM Plex Mono',monospace}.dex-bar{height:5px;background:#d7d7cf;border-radius:99px;overflow:hidden}.dex-bar span{display:block;height:100%;border-radius:inherit;background:var(--green)}.dex-bar.xp span{background:var(--blue)}
.dex-traits{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:22px}.dex-trait{padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.42)}.dex-trait strong{display:block;margin-top:5px;font-size:.84rem}.dex-move-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.dex-move-head strong{font:600 .66rem 'IBM Plex Mono',monospace;letter-spacing:.06em}.dex-moves{border-top:1px solid var(--line)}.dex-move{min-height:56px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border-bottom:1px solid var(--line)}.dex-move-main{display:flex;align-items:center;gap:8px;min-width:0}.dex-dot{width:7px;height:7px;flex:none;border-radius:50%;background:#a6aaa6}.dex-dot.fire{background:var(--fire);box-shadow:0 0 0 4px rgba(228,97,62,.09)}.dex-move-main strong{font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dex-move-main em{color:var(--muted);font-size:.64rem;font-style:normal}.dex-pp{font:600 .64rem 'IBM Plex Mono',monospace}
.dex-origin{display:grid;grid-template-columns:auto 1fr;gap:11px;margin-top:19px;padding:13px;border-radius:12px;background:var(--paper2)}.dex-ball{position:relative;width:31px;height:31px;align-self:center;border:2px solid var(--ink);border-radius:50%}.dex-ball:before{content:'';position:absolute;left:-2px;right:-2px;top:13px;border-top:2px solid var(--ink)}.dex-ball:after{content:'';position:absolute;left:8px;top:8px;width:10px;height:10px;border:2px solid var(--ink);border-radius:50%;background:var(--paper2)}.dex-origin strong{display:block;font-size:.77rem}.dex-origin span{display:block;margin-top:3px;color:var(--muted);font-size:.64rem}
.dex-nav{position:absolute;z-index:12;left:34px;right:calc(28% + 34px);bottom:16px;display:flex;justify-content:space-between;pointer-events:none}.dex-nav button{min-width:44px;min-height:44px;display:flex;align-items:center;gap:8px;padding:8px 11px;color:rgba(230,245,245,.72);background:rgba(7,12,14,.44);border:1px solid rgba(199,229,230,.14);border-radius:12px;backdrop-filter:blur(8px);pointer-events:auto}.dex-nav button:disabled{opacity:.6}.dex-nav svg{width:16px;height:16px}.dex-nav-copy{display:grid;text-align:left}.dex-nav-copy small{color:rgba(226,246,246,.42);font:500 .47rem 'IBM Plex Mono',monospace}.dex-nav-copy strong{font-size:.64rem}
@container dexpanel (max-width:430px){.dex-content{padding-inline:22px}.dex-facts{grid-template-columns:1fr}.dex-fact:nth-child(n){padding:13px 0;border-right:0;border-bottom:1px solid var(--line)}.dex-fact:last-child{border-bottom:0}}
@media(max-width:900px){.dex-page{padding:0}.dex-shell{min-height:100svh;border:0;border-radius:0}.dex-header{min-height:72px;grid-template-columns:1fr auto;padding:9px 14px}.dex-lens{width:40px;height:40px;border-width:4px}.dex-progress,.dex-lights{display:none}.dex-body{display:block;min-height:calc(100svh - 72px);margin:0;border-radius:0;overflow:visible;background:var(--paper)}.dex-stage{height:52svh;min-height:410px}.dex-stage-top{top:18px;left:18px;right:18px}.dex-viewer{inset:52px 0 76px}.dex-art{width:min(74%,430px)}.dex-ruler{left:17px;top:80px;bottom:82px}.dex-stage-bottom{left:18px;right:18px;bottom:16px;grid-template-columns:auto 1fr;gap:12px}.dex-name h1{font-size:clamp(2.6rem,12vw,4.5rem)}.dex-hint{display:none}.dex-panel{margin-top:-1px;border-left:0;border-radius:24px 24px 0 0;overflow:hidden;box-shadow:0 -14px 32px rgba(0,0,0,.16)}.dex-content{min-height:0;padding:26px 20px calc(34px + env(safe-area-inset-bottom))}.dex-tabs{min-height:58px}.dex-nav{left:12px;right:12px;top:calc(52svh - 58px);bottom:auto}.dex-nav-copy{display:none}.dex-nav button{width:44px;min-width:44px;justify-content:center;border-radius:50%;padding:0}}
@media(max-width:430px){.dex-title small{display:none}.dex-title strong{font-size:.8rem}.dex-tools .dex-icon:first-child{display:none}.dex-stage{height:49svh;min-height:390px}.dex-nav{top:calc(49svh - 58px)}.dex-meta{margin-top:8px}.dex-type{font-size:.61rem}}
@media(prefers-reduced-motion:reduce){.dex-stage:after,.dex-art{animation:none}.dex-art{opacity:.1}}
`;

type Tab = 'record' | 'owned';

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 256 256">
      <circle cx="128" cy="128" r="128" fill="currentColor" />
      <path d={FIRE_PATH} fill="#fff" />
    </svg>
  );
}

function Header() {
  return (
    <header className="dex-header">
      <div className="dex-brand">
        <div className="dex-lens" aria-hidden="true" />
        <div className="dex-lights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="dex-title">
          <strong>FIELD DEX</strong>
          <small>KANTO RESEARCH SYSTEM · V.01</small>
        </div>
      </div>
      <div className="dex-progress" aria-label="Entrada 004 de 386 na Pokédex Nacional">
        <small>NATIONAL DEX</small>
        <strong>004 / 386</strong>
      </div>
      <div className="dex-tools">
        <button className="dex-icon" type="button" aria-label="Pesquisar na Pokédex" disabled>
          <SearchIcon />
        </button>
        <a className="dex-icon" href="/" aria-label="Voltar ao Hub">
          <GridIcon />
        </a>
      </div>
    </header>
  );
}

function Stage({ pokemon }: { pokemon: PokemonDetailView }) {
  const visual = getStarterVisual(4);
  const displayName = pokemon.nickname || pokemon.species;
  const sexMark = pokemon.sex === 'male' ? '♂' : pokemon.sex === 'female' ? '♀' : '—';
  const sexLabel = pokemon.sex === 'male' ? 'Macho' : pokemon.sex === 'female' ? 'Fêmea' : 'Sem gênero';

  return (
    <section className="dex-stage" aria-labelledby="dex-name">
      <div className="dex-corners" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="dex-ruler" aria-hidden="true">
        <small>0.60 M · SCALE</small>
      </div>
      <div className="dex-stage-top">
        <div className="dex-code">DEX · KNT-{String(pokemon.speciesId).padStart(3, '0')} · SPECIMEN</div>
        <div className="dex-state">
          <span aria-hidden="true" /> CAPTURADO
        </div>
      </div>
      <img className="dex-art" src={visual.artworkHome.url} alt="" aria-hidden="true" decoding="async" />
      <div className="dex-viewer">
        <GenerationsPokemonViewer species={pokemon.species.toLowerCase()} name={pokemon.species} />
      </div>
      <div className="dex-stage-bottom">
        <span className="dex-number">#{String(pokemon.speciesId).padStart(3, '0')}</span>
        <div className="dex-name">
          <h1 id="dex-name">{displayName}</h1>
          <div className="dex-meta">
            <span className="dex-type">
              <FireIcon /> FOGO
            </span>
            <span className="dex-sex" role="img" aria-label={sexLabel}>
              {sexMark}
            </span>
          </div>
        </div>
        <span className="dex-hint">DRAG · ROTATE<br />PINCH · ZOOM</span>
      </div>
    </section>
  );
}

function RecordPanel() {
  return (
    <div id="record-panel" role="tabpanel" aria-labelledby="record-tab">
      <div className="dex-kicker">
        <span className="dex-label">REGISTRO DA ESPÉCIE</span>
        <span className="dex-entry">ENTRY 004</span>
      </div>
      <h2>Pokémon Lagarto</h2>
      <p className="dex-desc">
        A chama na ponta de sua cauda demonstra sua força vital. Desde o nascimento, ela permanece acesa e reage ao seu estado.
      </p>
      <div className="dex-facts">
        <div className="dex-fact"><span className="dex-label">TIPO</span><strong>Fogo</strong></div>
        <div className="dex-fact"><span className="dex-label">REGIÃO</span><strong>Kanto</strong></div>
        <div className="dex-fact"><span className="dex-label">ALTURA</span><strong>0,6 m</strong></div>
        <div className="dex-fact"><span className="dex-label">PESO</span><strong>8,5 kg</strong></div>
      </div>
      <div className="dex-research">
        <div className="dex-research-head"><strong>FIELD RESEARCH</strong><span>REGISTRADO</span></div>
        <div className="dex-track" aria-hidden="true"><span /></div>
        <p className="dex-note">Espécie vista e capturada. Registros de campo do RPG poderão ampliar este arquivo.</p>
      </div>
    </div>
  );
}

function OwnedPanel({ pokemon }: { pokemon: PokemonDetailView }) {
  const hp = Math.round((pokemon.hp.current / pokemon.hp.max) * 100);
  const xp = Math.round((pokemon.xp.current / pokemon.xp.nextLevel) * 100);
  return (
    <div id="owned-panel" role="tabpanel" aria-labelledby="owned-tab">
      <div className="dex-kicker">
        <span className="dex-label">MEU POKÉMON</span>
        <span className="dex-entry">INSTANCE · 004-A</span>
      </div>
      <h2>Seu parceiro</h2>
      <div className="dex-vitals">
        <div className="dex-level"><small>NÍVEL</small><strong>{pokemon.level}</strong></div>
        <div className="dex-bars">
          <div className="dex-bar-row"><span>HP</span><div className="dex-bar"><span style={{ width: `${hp}%` }} /></div><strong>{pokemon.hp.current}/{pokemon.hp.max}</strong></div>
          <div className="dex-bar-row"><span>XP</span><div className="dex-bar xp"><span style={{ width: `${xp}%` }} /></div><strong>{xp}%</strong></div>
        </div>
      </div>
      <div className="dex-traits">
        <div className="dex-trait"><span className="dex-label">NATURE</span><strong>{pokemon.nature}</strong></div>
        <div className="dex-trait"><span className="dex-label">ABILITY</span><strong>{pokemon.ability}</strong></div>
      </div>
      <div className="dex-move-head"><strong>MOVE SET</strong><span className="dex-label">PP ATUAL</span></div>
      <div className="dex-moves">
        {pokemon.moves.map((move) => (
          <div className="dex-move" key={move.name}>
            <div className="dex-move-main">
              <span className={`dex-dot ${move.type === 'Fogo' ? 'fire' : ''}`} aria-hidden="true" />
              <strong>{move.name}</strong><em>{move.type}</em>
            </div>
            <span className="dex-pp">{move.pp.current}/{move.pp.max}</span>
          </div>
        ))}
      </div>
      <div className="dex-origin">
        <span className="dex-ball" aria-hidden="true" />
        <div><strong>{pokemon.capture.location}</strong><span>{pokemon.capture.dateLabel} · {pokemon.capture.ball}</span></div>
      </div>
    </div>
  );
}

function DataPanel({ pokemon }: { pokemon: PokemonDetailView }) {
  const [tab, setTab] = useState<Tab>('record');
  return (
    <aside className="dex-panel" aria-label="Dados da Pokédex">
      <div className="dex-tabs" role="tablist" aria-label="Modo de consulta">
        <button id="record-tab" className="dex-tab" type="button" role="tab" aria-selected={tab === 'record'} aria-controls="record-panel" onClick={() => setTab('record')}>REGISTRO</button>
        <button id="owned-tab" className="dex-tab" type="button" role="tab" aria-selected={tab === 'owned'} aria-controls="owned-panel" onClick={() => setTab('owned')}>MEU POKÉMON</button>
      </div>
      <div className="dex-content">{tab === 'record' ? <RecordPanel /> : <OwnedPanel pokemon={pokemon} />}</div>
    </aside>
  );
}

function Navigator() {
  return (
    <nav className="dex-nav" aria-label="Navegação entre espécies">
      <button type="button" disabled aria-label="Pokémon anterior: Venusaur, número 003"><Chevron direction="left" /><span className="dex-nav-copy"><small>#003</small><strong>Venusaur</strong></span></button>
      <button type="button" disabled aria-label="Próximo Pokémon: Charmeleon, número 005"><span className="dex-nav-copy"><small>#005</small><strong>Charmeleon</strong></span><Chevron direction="right" /></button>
    </nav>
  );
}

export function PokemonDetailPage() {
  return (
    <main className="dex-page">
      <style>{styles}</style>
      <section className="dex-shell" aria-label="Field Dex — protótipo de Pokédex">
        <Header />
        <div className="dex-body"><Stage pokemon={demoCharmander} /><DataPanel pokemon={demoCharmander} /></div>
        <Navigator />
      </section>
    </main>
  );
}
