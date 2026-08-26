import { useState } from 'react';
import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import { getStarterVisual } from '../../visual-assets/starterManifest';
import { demoCharmander, type PokemonDetailView } from './pokemonDetailMock';
import './pokemon-detail.css';

type Tab = 'record' | 'owned';

type IconName = 'search' | 'grid' | 'chevron-left' | 'chevron-right';

function Icon({ name }: { name: IconName }) {
  if (name === 'search') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }
  if (name === 'grid') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }
  const d = name === 'chevron-left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6';
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function FireTypeIcon() {
  return (
    <svg className="dex-type-icon" viewBox="0 0 256 256" aria-hidden="true">
      <circle cx="128" cy="128" r="128" />
      <path d="M101.14 196.71c-18.04-4.97-32.15-33.23-26.12-56.44 2.47-9.5 6.73-18.04 13.15-25.42 5.67-6.52 11.56-12.86 17.44-19.19 16.45-17.72 16.84-21.84 3.67-40.92 16.66-6.33 35.79 6.81 36.26 24.87.23 8.92-3.12 16.84-6.55 24.78-2.86 6.61-3.94 13.22 1.46 21.46.78-7.78.25-13.98 5.16-19.12 5.44-5.7 9.99-7.61 18.26-5.74-8 6.58-6.97 10.9 6.52 29.92 12.34 17.41 15.7 32.35 6.6 48.54-9.75 17.35-30.86 27.88-50.31 24.97 1.32-2.15 5-3.89 7.7-5.48 12.95-7.61 14.91-19.54 4.94-30.71-3.31-3.71-7.06-7.04-10.68-10.47-14.71-13.95-16.33-16.83-20.12-36.25-20.01 10.96-23.87 46.75-7.38 75.23Z" />
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
      <div
        className="dex-progress"
        role="group"
        aria-label="Entrada 004 de 386 na Pokédex Nacional"
      >
        <small>NATIONAL DEX</small>
        <strong>004 / 386</strong>
      </div>
      <div className="dex-tools">
        <button className="dex-icon" type="button" aria-label="Pesquisar na Pokédex" disabled>
          <Icon name="search" />
        </button>
        <a className="dex-icon" href="/" aria-label="Voltar ao Hub">
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
  const sexLabel = pokemon.sex === 'male' ? 'Macho' : pokemon.sex === 'female' ? 'Fêmea' : 'Sem gênero';

  return (
    <section className="dex-specimen" aria-labelledby="dex-pokemon-name">
      <div className="dex-screen-corners" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="dex-height-ruler" aria-hidden="true">
        <span>0.60 M · SCALE</span>
      </div>

      <div className="dex-specimen-top">
        <div className="dex-code">
          DEX · KNT-{String(pokemon.speciesId).padStart(3, '0')} · SPECIMEN
        </div>
        <div className="dex-register-state">
          <i className="dex-status-dot" />
          <strong>CAPTURADO</strong>
        </div>
      </div>

      <img
        className="dex-artwork"
        src={visual.artworkHome.url}
        alt=""
        aria-hidden="true"
        decoding="async"
      />

      <div className="dex-viewer">
        <GenerationsPokemonViewer species={pokemon.species.toLowerCase()} name={pokemon.species} />
      </div>

      <div className="dex-specimen-bottom">
        <span className="dex-dex-number">#{String(pokemon.speciesId).padStart(3, '0')}</span>
        <div className="dex-name-block">
          <h1 id="dex-pokemon-name">{displayName}</h1>
          <div className="dex-name-meta">
            <span className="dex-type-chip">
              <FireTypeIcon /> FOGO
            </span>
            <span className="dex-sex" role="img" aria-label={sexLabel}>
              {sex}
            </span>
          </div>
        </div>
        <span className="dex-view-hint">
          DRAG · ROTATE
          <br />
          PINCH · ZOOM
        </span>
      </div>
    </section>
  );
}

function RecordPanel() {
  return (
    <div id="dex-record-panel" role="tabpanel" aria-labelledby="dex-record-tab">
      <div className="dex-panel-kicker">
        <span className="dex-label">REGISTRO DA ESPÉCIE</span>
        <span className="dex-record-id">ENTRY 004</span>
      </div>
      <h2>Pokémon Lagarto</h2>
      <p className="dex-description">
        A chama na ponta de sua cauda demonstra sua força vital. Desde o nascimento, a chama
        permanece acesa e reage ao seu estado.
      </p>

      <div className="dex-facts">
        <div className="dex-fact">
          <span className="dex-label">TIPO</span>
          <strong>Fogo</strong>
        </div>
        <div className="dex-fact">
          <span className="dex-label">REGIÃO</span>
          <strong>Kanto</strong>
        </div>
        <div className="dex-fact">
          <span className="dex-label">ALTURA</span>
          <strong>0,6 m</strong>
        </div>
        <div className="dex-fact">
          <span className="dex-label">PESO</span>
          <strong>8,5 kg</strong>
        </div>
      </div>

      <div className="dex-research">
        <div className="dex-research-head">
          <strong>FIELD RESEARCH</strong>
          <span>REGISTRADO</span>
        </div>
        <div className="dex-research-track" aria-hidden="true">
          <div className="dex-research-fill" />
        </div>
        <p className="dex-research-note">
          Espécie vista e capturada. Novos registros de campo podem ampliar este arquivo no RPG.
        </p>
      </div>
    </div>
  );
}

function OwnedPanel({ pokemon }: { pokemon: PokemonDetailView }) {
  const hpPercent = Math.round((pokemon.hp.current / pokemon.hp.max) * 100);
  const xpPercent = Math.round((pokemon.xp.current / pokemon.xp.nextLevel) * 100);

  return (
    <div id="dex-owned-panel" role="tabpanel" aria-labelledby="dex-owned-tab">
      <div className="dex-panel-kicker">
        <span className="dex-label">MEU POKÉMON</span>
        <span className="dex-record-id">INSTANCE · 004-A</span>
      </div>
      <h2>Seu parceiro</h2>

      <div className="dex-vitals">
        <div className="dex-level">
          <span>NÍVEL</span>
          <strong>{pokemon.level}</strong>
        </div>
        <div className="dex-bars">
          <div className="dex-bar-row">
            <span>HP</span>
            <div className="dex-bar">
              <i style={{ width: `${hpPercent}%` }} />
            </div>
            <strong>
              {pokemon.hp.current}/{pokemon.hp.max}
            </strong>
          </div>
          <div className="dex-bar-row">
            <span>XP</span>
            <div className="dex-bar dex-bar--xp">
              <i style={{ width: `${xpPercent}%` }} />
            </div>
            <strong>{xpPercent}%</strong>
          </div>
        </div>
      </div>

      <div className="dex-traits">
        <div className="dex-trait">
          <span className="dex-label">NATURE</span>
          <strong>{pokemon.nature}</strong>
        </div>
        <div className="dex-trait">
          <span className="dex-label">ABILITY</span>
          <strong>{pokemon.ability}</strong>
        </div>
      </div>

      <div className="dex-moves">
        {pokemon.moves.map((move) => (
          <div className="dex-move" key={move.name}>
            <span>{move.type}</span>
            <strong>{move.name}</strong>
            <small>
              PP {move.pp.current}/{move.pp.max}
            </small>
          </div>
        ))}
      </div>

      <div className="dex-capture-log">
        <div className="dex-capture-mark" aria-hidden="true">
          ◉
        </div>
        <div>
          <span className="dex-label">REGISTRO DE CAPTURA</span>
          <strong>{pokemon.capture.location}</strong>
          <p>{pokemon.capture.dateLabel}</p>
        </div>
        <span>{pokemon.capture.ball}</span>
      </div>
    </div>
  );
}

export function PokemonDetailPage() {
  const [tab, setTab] = useState<Tab>('record');
  const pokemon = demoCharmander;

  return (
    <main className="dex-page">
      <Header />
      <div className="dex-shell">
        <SpecimenScreen pokemon={pokemon} />
        <section className="dex-info-panel" aria-label="Informações do Pokémon">
          <div className="dex-tabs" role="tablist" aria-label="Modo da Pokédex">
            <button
              id="dex-record-tab"
              type="button"
              role="tab"
              aria-selected={tab === 'record'}
              aria-controls="dex-record-panel"
              className={tab === 'record' ? 'is-active' : ''}
              onClick={() => setTab('record')}
            >
              REGISTRO
            </button>
            <button
              id="dex-owned-tab"
              type="button"
              role="tab"
              aria-selected={tab === 'owned'}
              aria-controls="dex-owned-panel"
              className={tab === 'owned' ? 'is-active' : ''}
              onClick={() => setTab('owned')}
            >
              MEU POKÉMON
            </button>
          </div>

          <div className="dex-panel-body">
            {tab === 'record' ? <RecordPanel /> : <OwnedPanel pokemon={pokemon} />}
          </div>

          <nav className="dex-species-nav" aria-label="Navegação entre espécies">
            <button type="button" disabled>
              <Icon name="chevron-left" />
              <span>
                <small>#003</small>
                ANTERIOR
              </span>
            </button>
            <button type="button" disabled>
              <span>
                <small>#005</small>
                PRÓXIMO
              </span>
              <Icon name="chevron-right" />
            </button>
          </nav>
        </section>
      </div>
      <footer className="dex-footer">
        <span>FIELD DEX · PLAYER COMPANION</span>
        <span>PROTÓTIPO · DADOS MOCK</span>
      </footer>
    </main>
  );
}
