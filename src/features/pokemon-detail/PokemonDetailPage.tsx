import { useState } from 'react';
import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import {
  getFieldDexNeighbours,
  getFieldDexSpecies,
  getFieldDexVisual,
  typeAccent,
  type FieldDexSpecies,
} from './fieldDexSpecies';
import { getReviewPokemon, type PokemonDetailView } from './pokemonDetailMock';

const styles = String.raw`
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
.dex-page{--red:#d43a46;--red-dark:#9f2630;--ink:#172024;--screen:#142025;--paper:#f2f0e8;--paper-2:#e9e7de;--muted:#717b7f;--line:rgba(23,32,36,.13);--cyan:#87e1e7;--blue:#48c6ee;--green:#79c98d;--fire:#e35f3c;min-height:100svh;padding:clamp(10px,2vw,24px);background:#0d1113;color:var(--ink);font-family:'IBM Plex Sans',system-ui,sans-serif}
.dex-shell{position:relative;width:min(1460px,100%);min-height:calc(100svh - clamp(20px,4vw,48px));margin:auto;overflow:hidden;border:1px solid rgba(255,255,255,.11);border-radius:28px;background:var(--red);box-shadow:0 32px 84px rgba(0,0,0,.42)}
.dex-header{min-height:80px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:11px clamp(18px,2.4vw,32px);color:#fff;background:linear-gradient(180deg,#df4550,#ca313d);border-bottom:1px solid rgba(72,0,10,.25)}
.dex-brand{display:flex;align-items:center;gap:12px;min-width:0}.dex-lens{width:44px;height:44px;flex:none;border:4px solid #eef7f6;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ebffff 0 8%,#68e7ef 10% 28%,#1b91b5 56%,#0b5870 78%);box-shadow:0 0 0 2px rgba(0,0,0,.14),0 0 18px rgba(91,226,242,.22)}
.dex-title strong{display:block;font:700 .94rem 'Space Grotesk',sans-serif;letter-spacing:.09em}.dex-title small,.dex-progress small,.dex-code,.dex-label{font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.1em}.dex-title small{display:block;margin-top:2px;color:rgba(255,255,255,.63);font-size:.54rem}.dex-progress{text-align:center}.dex-progress small{display:block;color:rgba(255,255,255,.6);font-size:.51rem}.dex-progress strong{font:600 .82rem 'IBM Plex Mono',monospace}.dex-tools{justify-self:end;display:flex;gap:8px}.dex-icon{width:44px;height:44px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.17);border-radius:12px;color:#fff;background:rgba(70,0,9,.13);text-decoration:none}.dex-icon svg{width:19px;height:19px}
.dex-body{display:grid;grid-template-columns:minmax(0,1.48fr) minmax(370px,.72fr);min-height:calc(100svh - 128px);margin:11px;overflow:hidden;border-radius:18px;background:var(--screen);box-shadow:0 11px 28px rgba(71,0,9,.22)}
.dex-stage{position:relative;min-height:680px;overflow:hidden;color:#eef8f8;background:linear-gradient(rgba(188,226,229,.075) 1px,transparent 1px),linear-gradient(90deg,rgba(188,226,229,.075) 1px,transparent 1px),radial-gradient(circle at 50% 44%,rgba(81,146,152,.13),transparent 38%),linear-gradient(150deg,#19272b,#10181b 76%);background-size:46px 46px,46px 46px,auto,auto}
.dex-stage:after{content:'';position:absolute;z-index:2;inset:0;background:radial-gradient(ellipse at center,transparent 45%,rgba(3,8,10,.23) 100%);pointer-events:none}.dex-corners{position:absolute;z-index:5;inset:24px;pointer-events:none}.dex-corners span{position:absolute;width:30px;height:30px;opacity:.46}.dex-corners span:nth-child(1){left:0;top:0;border-left:1px solid var(--cyan);border-top:1px solid var(--cyan)}.dex-corners span:nth-child(2){right:0;top:0;border-right:1px solid var(--cyan);border-top:1px solid var(--cyan)}.dex-corners span:nth-child(3){left:0;bottom:0;border-left:1px solid var(--cyan);border-bottom:1px solid var(--cyan)}.dex-corners span:nth-child(4){right:0;bottom:0;border-right:1px solid var(--cyan);border-bottom:1px solid var(--cyan)}
.dex-stage-top{position:absolute;z-index:8;top:25px;left:30px;right:30px;display:flex;justify-content:space-between;gap:16px;align-items:center;pointer-events:none}.dex-code{font-size:.62rem;color:rgba(222,246,246,.58)}.dex-state{display:flex;align-items:center;gap:8px;font:600 .61rem 'IBM Plex Mono',monospace;letter-spacing:.075em}.dex-state span{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 9px rgba(121,201,141,.48)}
.dex-art{position:absolute;z-index:1;left:50%;top:48%;width:min(62%,540px);max-height:65%;object-fit:contain;transform:translate(-50%,-50%);opacity:.86;filter:saturate(.9) drop-shadow(0 26px 52px rgba(0,0,0,.27));pointer-events:none;transition:opacity .24s ease,filter .24s ease}.dex-art.is-ready{opacity:0;filter:saturate(.6)}
.dex-viewer{position:absolute;z-index:3;inset:66px 7% 112px}.dex-viewer .generations-demo,.dex-viewer .generations-viewer-shell,.dex-viewer .generations-host{width:100%;height:100%;min-height:0;border:0;border-radius:0;background:transparent;box-shadow:none}.dex-viewer .generations-status,.dex-viewer .generations-error{display:none}.dex-viewer .generations-loading{left:50%;bottom:14px;transform:translateX(-50%);padding:8px 11px;color:#bfd6d7;background:rgba(5,11,13,.54);border:1px solid rgba(141,231,235,.13);border-radius:10px;backdrop-filter:blur(8px);font:500 .56rem 'IBM Plex Mono',monospace}
.dex-ruler{position:absolute;z-index:5;left:27px;top:102px;bottom:118px;width:22px;border-left:1px solid rgba(192,229,231,.2);background:repeating-linear-gradient(180deg,transparent 0 24px,rgba(192,229,231,.19) 24px 25px);pointer-events:none}.dex-ruler small{position:absolute;bottom:0;left:7px;color:rgba(220,241,241,.42);font:500 .48rem 'IBM Plex Mono',monospace;writing-mode:vertical-rl}.dex-ruler strong{position:absolute;top:-19px;left:-1px;color:rgba(220,241,241,.58);font:600 .5rem 'IBM Plex Mono',monospace;white-space:nowrap}
.dex-identity{position:absolute;z-index:8;left:31px;right:31px;bottom:24px;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;pointer-events:none}.dex-name{min-width:0}.dex-name h1{margin:0;font:700 clamp(2.2rem,4.2vw,4.3rem)/.92 'Space Grotesk',sans-serif;letter-spacing:-.045em}.dex-meta{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:9px}.dex-type{display:inline-flex;align-items:center;gap:7px;padding:5px 9px;border:1px solid rgba(255,255,255,.2);border-radius:99px;background:rgba(255,255,255,.08);font-size:.62rem;font-weight:700}.dex-type-dot{width:8px;height:8px;border-radius:50%}.dex-sex{color:#8bd8ff;font:600 .77rem 'IBM Plex Mono',monospace}.dex-hint{text-align:right;color:rgba(226,246,246,.4);font:500 .52rem/1.55 'IBM Plex Mono',monospace;letter-spacing:.04em}
.dex-nav{position:absolute;z-index:9;left:18px;right:18px;top:50%;display:flex;justify-content:space-between;transform:translateY(-50%);pointer-events:none}.dex-nav a{min-height:48px;display:flex;align-items:center;gap:7px;padding:6px 9px;color:rgba(230,245,245,.82);background:rgba(7,12,14,.42);border:1px solid rgba(199,229,230,.14);border-radius:11px;backdrop-filter:blur(7px);pointer-events:auto;text-decoration:none}.dex-nav a:last-child{text-align:right}.dex-nav svg{width:15px;height:15px;flex:none}.dex-nav-sprite{width:34px;height:26px;object-fit:contain;image-rendering:auto}.dex-nav-copy{display:grid;text-align:left}.dex-nav a:last-child .dex-nav-copy{text-align:right}.dex-nav-copy small{color:rgba(226,246,246,.45);font:500 .45rem 'IBM Plex Mono',monospace}.dex-nav-copy strong{font-size:.61rem;letter-spacing:.01em}
.dex-panel{container:dexpanel / inline-size;position:relative;z-index:10;color:var(--ink);background:var(--paper);border-left:1px solid rgba(255,255,255,.06)}.dex-tabs{display:grid;grid-template-columns:1fr 1fr;min-height:60px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.16)}.dex-tab{position:relative;border:0;background:transparent;color:var(--muted);font:600 .68rem 'IBM Plex Mono',monospace;letter-spacing:.09em;cursor:pointer}.dex-tab+.dex-tab{border-left:1px solid var(--line)}.dex-tab[aria-selected='true']{color:var(--ink)}.dex-tab[aria-selected='true']:after{content:'';position:absolute;left:23%;right:23%;bottom:-1px;height:3px;background:var(--red);border-radius:3px 3px 0 0}
.dex-content{min-height:620px;padding:clamp(24px,3vw,40px)}.dex-kicker{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:20px}.dex-label{color:var(--muted);font-size:.56rem}.dex-entry{color:var(--red);font:600 .58rem 'IBM Plex Mono',monospace;letter-spacing:.05em}.dex-record-title{display:grid;gap:5px}.dex-record-title strong{font:700 clamp(1.55rem,2.4vw,2.35rem)/1 'Space Grotesk',sans-serif;letter-spacing:-.032em}.dex-desc{margin:15px 0 22px;color:#465054;font-size:.91rem;line-height:1.6}
.dex-facts{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.dex-fact{min-height:69px;display:flex;flex-direction:column;justify-content:center;gap:5px;padding:11px 0}.dex-fact:nth-child(odd){padding-right:17px;border-right:1px solid var(--line)}.dex-fact:nth-child(even){padding-left:17px}.dex-fact:nth-child(-n+2){border-bottom:1px solid var(--line)}.dex-fact strong{font:600 .88rem 'Space Grotesk',sans-serif}.dex-research{margin-top:22px;padding:15px;border-radius:12px;color:#dcecec;background:#202a2d}.dex-research-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;font:600 .61rem 'IBM Plex Mono',monospace;letter-spacing:.05em}.dex-research-head span{color:#9cb1b4}.dex-track{height:4px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden}.dex-track span{display:block;width:72%;height:100%;background:linear-gradient(90deg,var(--cyan),#c9f6db)}.dex-note{margin:9px 0 0;color:#94a7aa;font-size:.68rem;line-height:1.45}
.dex-owned-heading{display:flex;align-items:center;gap:12px}.dex-portrait{width:48px;height:48px;object-fit:contain;image-rendering:pixelated}.dex-vitals{display:grid;grid-template-columns:78px 1fr;gap:16px;align-items:center;margin:18px 0 21px;padding-bottom:21px;border-bottom:1px solid var(--line)}.dex-owned-title{margin:0;font:700 1.65rem/1 'Space Grotesk',sans-serif;letter-spacing:-.03em}.dex-level{display:grid;place-items:center;width:74px;height:74px;border-radius:50%;color:#fff;background:var(--red);box-shadow:inset 0 0 0 5px rgba(255,255,255,.1)}.dex-level small{font:500 .48rem 'IBM Plex Mono',monospace}.dex-level strong{font:700 1.55rem 'Space Grotesk',sans-serif;line-height:1}.dex-bars{display:grid;gap:10px}.dex-bar-row{display:grid;grid-template-columns:26px 1fr auto;gap:8px;align-items:center}.dex-bar-row>span{color:var(--muted);font:600 .54rem 'IBM Plex Mono',monospace}.dex-bar-row strong{font:600 .6rem 'IBM Plex Mono',monospace}.dex-bar{height:5px;background:#d7d7cf;border-radius:99px;overflow:hidden}.dex-bar span{display:block;height:100%;border-radius:inherit;background:var(--green)}.dex-bar.xp span{background:var(--blue)}.dex-traits{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:20px}.dex-trait{padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.4)}.dex-trait strong{display:block;margin-top:4px;font-size:.81rem}.dex-move-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.dex-move-head strong{font:600 .64rem 'IBM Plex Mono',monospace;letter-spacing:.06em}.dex-moves{border-top:1px solid var(--line)}.dex-move{min-height:52px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border-bottom:1px solid var(--line)}.dex-move-main{display:flex;align-items:center;gap:8px;min-width:0}.dex-dot{width:7px;height:7px;flex:none;border-radius:50%;background:#a6aaa6}.dex-move-main strong{font-size:.79rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dex-move-main em{color:var(--muted);font-size:.62rem;font-style:normal}.dex-pp{font:600 .62rem 'IBM Plex Mono',monospace}.dex-origin{display:grid;grid-template-columns:auto 1fr;gap:10px;margin-top:17px;padding:12px;border-radius:11px;background:var(--paper-2)}.dex-ball{position:relative;width:30px;height:30px;align-self:center;border:2px solid var(--ink);border-radius:50%}.dex-ball:before{content:'';position:absolute;left:-2px;right:-2px;top:12px;border-top:2px solid var(--ink)}.dex-ball:after{content:'';position:absolute;left:8px;top:8px;width:10px;height:10px;border:2px solid var(--ink);border-radius:50%;background:var(--paper-2)}.dex-origin strong{display:block;font-size:.75rem}.dex-origin span{display:block;margin-top:3px;color:var(--muted);font-size:.62rem}
@container dexpanel (max-width:430px){.dex-content{padding-inline:22px}.dex-facts{grid-template-columns:1fr 1fr}}
@media(max-width:900px){.dex-page{padding:0}.dex-shell{min-height:100svh;border:0;border-radius:0}.dex-header{min-height:68px;grid-template-columns:1fr auto;padding:8px 14px}.dex-lens{width:39px;height:39px}.dex-progress{display:none}.dex-title small{font-size:.48rem}.dex-body{display:block;min-height:calc(100svh - 68px);margin:0;border-radius:0;overflow:visible;background:var(--paper)}.dex-stage{height:53svh;min-height:420px}.dex-stage-top{top:17px;left:18px;right:18px}.dex-code{font-size:.54rem}.dex-viewer{inset:53px 4% 108px}.dex-art{top:47%;width:min(68%,420px);max-height:63%}.dex-ruler{left:17px;top:82px;bottom:112px}.dex-corners{inset:18px}.dex-identity{left:19px;right:19px;bottom:23px}.dex-name h1{font-size:clamp(2rem,9.6vw,3rem)}.dex-hint{display:none}.dex-nav{left:10px;right:10px}.dex-nav a{min-height:44px;padding:5px 7px}.dex-nav-sprite{width:30px;height:24px}.dex-panel{margin-top:-18px;border-left:0;border-radius:22px 22px 0 0;overflow:hidden;box-shadow:0 -12px 28px rgba(0,0,0,.16)}.dex-panel:before{content:'';display:block;width:38px;height:3px;margin:8px auto -2px;border-radius:99px;background:rgba(23,32,36,.18)}.dex-tabs{min-height:56px}.dex-content{min-height:0;padding:23px 20px calc(34px + env(safe-area-inset-bottom))}.dex-kicker{margin-bottom:16px}.dex-desc{margin:13px 0 19px}.dex-research{margin-top:19px}}
@media(max-width:430px){.dex-title small{display:none}.dex-title strong{font-size:.79rem}.dex-tools .dex-icon:first-child{display:none}.dex-stage{height:51svh;min-height:405px}.dex-viewer{inset:50px 2% 104px}.dex-art{width:min(72%,390px)}.dex-ruler strong{display:none}.dex-name h1{font-size:clamp(1.95rem,9.8vw,2.65rem)}.dex-type{font-size:.56rem}.dex-nav-copy strong{font-size:.48rem}.dex-nav-copy small{font-size:.43rem}.dex-nav-sprite{display:none}.dex-content{padding-inline:18px}.dex-record-title strong{font-size:1.52rem}.dex-desc{font-size:.86rem;line-height:1.55}.dex-fact{min-height:62px}}
@media(prefers-reduced-motion:reduce){.dex-art{transition:none}}
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

function Header({ species }: { species: FieldDexSpecies }) {
  const dex = String(species.dex).padStart(3, '0');
  return (
    <header className="dex-header">
      <div className="dex-brand">
        <div className="dex-lens" aria-hidden="true" />
        <div className="dex-title">
          <strong>FIELD DEX</strong>
          <small>{species.region.toUpperCase()} · RESEARCH DEVICE</small>
        </div>
      </div>
      <div className="dex-progress" role="group" aria-label={`Entrada ${dex} de 386 na Pokédex Nacional`}>
        <small>NATIONAL INDEX</small>
        <strong>{dex} / 386</strong>
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

function Navigator({ routeSlug }: { routeSlug: string }) {
  const { previous, next } = getFieldDexNeighbours(routeSlug);
  const previousVisual = getFieldDexVisual(previous.dex);
  const nextVisual = getFieldDexVisual(next.dex);
  return (
    <nav className="dex-nav" aria-label="Navegação entre registros carregados da Pokédex">
      <a href={`/pokemon/${previous.routeSlug}`} aria-label={`Registro anterior: ${previous.name}, número ${previous.dex}`}>
        <Chevron direction="left" />
        <img className="dex-nav-sprite" src={previousVisual.icon} alt="" aria-hidden="true" />
        <span className="dex-nav-copy">
          <small>{String(previous.dex).padStart(3, '0')}</small>
          <strong>{previous.name.toUpperCase()}</strong>
        </span>
      </a>
      <a href={`/pokemon/${next.routeSlug}`} aria-label={`Próximo registro: ${next.name}, número ${next.dex}`}>
        <span className="dex-nav-copy">
          <small>{String(next.dex).padStart(3, '0')}</small>
          <strong>{next.name.toUpperCase()}</strong>
        </span>
        <img className="dex-nav-sprite" src={nextVisual.icon} alt="" aria-hidden="true" />
        <Chevron direction="right" />
      </a>
    </nav>
  );
}

function TypeBadge({ type }: { type: string }) {
  const accent = typeAccent(type);
  return (
    <span
      className="dex-type"
      style={{ borderColor: `${accent}66`, background: `${accent}20` }}
    >
      <span className="dex-type-dot" style={{ background: accent }} aria-hidden="true" />
      {type.toUpperCase()}
    </span>
  );
}

function Stage({ pokemon, species }: { pokemon: PokemonDetailView; species: FieldDexSpecies }) {
  const visual = getFieldDexVisual(species.dex);
  const [modelReady, setModelReady] = useState(false);
  const displayName = pokemon.nickname || species.name;
  const sexMark = pokemon.sex === 'male' ? '♂' : pokemon.sex === 'female' ? '♀' : '—';
  const sexLabel = pokemon.sex === 'male' ? 'Macho' : pokemon.sex === 'female' ? 'Fêmea' : 'Sem gênero';

  return (
    <section className="dex-stage" aria-labelledby="dex-name">
      <div className="dex-corners" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="dex-ruler" aria-hidden="true"><strong>HEIGHT</strong><small>{species.height.toUpperCase()} · FIELD SCALE</small></div>
      <div className="dex-stage-top">
        <div className="dex-code">NATIONAL {String(species.dex).padStart(3, '0')} · {species.region.toUpperCase()}</div>
        <div className="dex-state"><span aria-hidden="true" /> CAPTURADO</div>
      </div>
      <img
        className={`dex-art${modelReady ? ' is-ready' : ''}`}
        src={visual.artworkHome}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div className="dex-viewer">
        <GenerationsPokemonViewer
          species={species.slug}
          name={species.name}
          onReadyChange={setModelReady}
        />
      </div>
      <Navigator routeSlug={species.routeSlug} />
      <div className="dex-identity">
        <div className="dex-name">
          <h1 id="dex-name">{displayName}</h1>
          <div className="dex-meta">
            {species.types.map((type) => <TypeBadge type={type} key={type} />)}
            <span className="dex-sex" role="img" aria-label={sexLabel}>{sexMark}</span>
          </div>
        </div>
        <span className="dex-hint">DRAG · ROTATE<br />PINCH · ZOOM</span>
      </div>
    </section>
  );
}

function RecordPanel({ species }: { species: FieldDexSpecies }) {
  return (
    <div id="record-panel" role="tabpanel" aria-labelledby="record-tab">
      <div className="dex-kicker">
        <span className="dex-label">REGISTRO DA ESPÉCIE</span>
        <span className="dex-entry">{species.region.toUpperCase()} / {String(species.dex).padStart(3, '0')}</span>
      </div>
      <div className="dex-record-title">
        <span className="dex-label">CLASSIFICAÇÃO</span>
        <strong>{species.category}</strong>
      </div>
      <p className="dex-desc">{species.description}</p>
      <div className="dex-facts">
        <div className="dex-fact"><span className="dex-label">TIPO</span><strong>{species.types.join(' · ')}</strong></div>
        <div className="dex-fact"><span className="dex-label">REGIÃO</span><strong>{species.region}</strong></div>
        <div className="dex-fact"><span className="dex-label">ALTURA</span><strong>{species.height}</strong></div>
        <div className="dex-fact"><span className="dex-label">PESO</span><strong>{species.weight}</strong></div>
      </div>
      <div className="dex-research">
        <div className="dex-research-head"><strong>PESQUISA DE CAMPO</strong><span>REGISTRADO</span></div>
        <div className="dex-track" aria-hidden="true"><span /></div>
        <p className="dex-note">Espécie vista e capturada. Registros de campo do RPG poderão ampliar este arquivo.</p>
      </div>
    </div>
  );
}

function OwnedPanel({ pokemon, species }: { pokemon: PokemonDetailView; species: FieldDexSpecies }) {
  const hp = Math.round((pokemon.hp.current / pokemon.hp.max) * 100);
  const xp = Math.round((pokemon.xp.current / pokemon.xp.nextLevel) * 100);
  const visual = getFieldDexVisual(species.dex);
  return (
    <div id="owned-panel" role="tabpanel" aria-labelledby="owned-tab">
      <div className="dex-kicker">
        <span className="dex-label">MEU POKÉMON</span>
        <span className="dex-entry">INSTÂNCIA · {String(species.dex).padStart(3, '0')}-A</span>
      </div>
      <div className="dex-owned-heading">
        <img
          className="dex-portrait"
          src={visual.portrait}
          alt={`Retrato de ${species.name}`}
          onError={(event) => { event.currentTarget.hidden = true; }}
        />
        <h2 className="dex-owned-title">Seu parceiro</h2>
      </div>
      <div className="dex-vitals">
        <div className="dex-level"><small>NÍVEL</small><strong>{pokemon.level}</strong></div>
        <div className="dex-bars">
          <div className="dex-bar-row"><span>HP</span><div className="dex-bar"><span style={{ width: `${hp}%` }} /></div><strong>{pokemon.hp.current}/{pokemon.hp.max}</strong></div>
          <div className="dex-bar-row"><span>XP</span><div className="dex-bar xp"><span style={{ width: `${xp}%` }} /></div><strong>{xp}%</strong></div>
        </div>
      </div>
      <div className="dex-traits">
        <div className="dex-trait"><span className="dex-label">NATUREZA</span><strong>{pokemon.nature}</strong></div>
        <div className="dex-trait"><span className="dex-label">HABILIDADE</span><strong>{pokemon.ability}</strong></div>
      </div>
      <div className="dex-move-head"><strong>GOLPES</strong><span className="dex-label">PP ATUAL</span></div>
      <div className="dex-moves">
        {pokemon.moves.map((move) => (
          <div className="dex-move" key={move.name}>
            <div className="dex-move-main">
              <span className="dex-dot" style={{ background: typeAccent(move.type) }} aria-hidden="true" />
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

function DataPanel({ pokemon, species }: { pokemon: PokemonDetailView; species: FieldDexSpecies }) {
  const [tab, setTab] = useState<Tab>('record');
  return (
    <aside className="dex-panel" aria-label="Dados da Pokédex">
      <div className="dex-tabs" role="tablist" aria-label="Modo de consulta">
        <button id="record-tab" className="dex-tab" type="button" role="tab" aria-selected={tab === 'record'} aria-controls="record-panel" onClick={() => setTab('record')}>REGISTRO</button>
        <button id="owned-tab" className="dex-tab" type="button" role="tab" aria-selected={tab === 'owned'} aria-controls="owned-panel" onClick={() => setTab('owned')}>MEU POKÉMON</button>
      </div>
      <div className="dex-content">
        {tab === 'record' ? <RecordPanel species={species} /> : <OwnedPanel pokemon={pokemon} species={species} />}
      </div>
    </aside>
  );
}

export function PokemonDetailPage({ routeSlug }: { routeSlug: string }) {
  const species = getFieldDexSpecies(routeSlug);
  const pokemon = getReviewPokemon(species.routeSlug);
  return (
    <main className="dex-page">
      <style>{styles}</style>
      <section className="dex-shell" aria-label={`Field Dex — registro de ${species.name}`}>
        <Header species={species} />
        <div className="dex-body">
          <Stage pokemon={pokemon} species={species} />
          <DataPanel pokemon={pokemon} species={species} />
        </div>
      </section>
    </main>
  );
}
