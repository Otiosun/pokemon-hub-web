import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import { demoCharmander, type PokemonDetailView } from './pokemonDetailMock';
import './pokemon-detail.css';

const statLabels = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  specialAttack: 'Atq. Esp.',
  specialDefense: 'Def. Esp.',
  speed: 'Velocidade',
} as const;

function percent(current: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function DetailHero({ pokemon }: { pokemon: PokemonDetailView }) {
  const hpPercent = percent(pokemon.hp.current, pokemon.hp.max);
  const xpPercent = percent(pokemon.xp.current, pokemon.xp.nextLevel);
  const sexLabel =
    pokemon.sex === 'male' ? 'Macho' : pokemon.sex === 'female' ? 'Fêmea' : 'Sem gênero';

  return (
    <section className="pokemon-hero" aria-labelledby="pokemon-name">
      <header className="pokemon-topbar">
        <a className="back-link" href="/">
          <span aria-hidden="true">←</span>
          Hub
        </a>
        <span className="mock-badge">protótipo · dados mock</span>
        <button className="more-button" type="button" aria-label="Mais opções" disabled>
          •••
        </button>
      </header>

      <div className="pokemon-stage-copy">
        <p className="pokemon-kicker">#{String(pokemon.speciesId).padStart(3, '0')} · parceiro</p>
        <div className="pokemon-name-row">
          <h1 id="pokemon-name">{pokemon.nickname || pokemon.species}</h1>
          <span className="sex-mark" role="img" aria-label={sexLabel}>
            {pokemon.sex === 'male' ? '♂' : pokemon.sex === 'female' ? '♀' : '—'}
          </span>
        </div>
        {pokemon.nickname && <p className="species-name">{pokemon.species}</p>}
      </div>

      <div className="pokemon-stage">
        <GenerationsPokemonViewer species={pokemon.species.toLowerCase()} name={pokemon.species} />
      </div>

      <div className="pokemon-vitals">
        <div className="level-pill">
          <span>NÍVEL</span>
          <strong>{pokemon.level}</strong>
        </div>
        <div className="vital-bars">
          <div className="vital-row">
            <span>HP</span>
            <div className="bar-track" aria-hidden="true">
              <div className="bar-fill hp-fill" style={{ width: `${hpPercent}%` }} />
            </div>
            <strong>
              {pokemon.hp.current}/{pokemon.hp.max}
            </strong>
          </div>
          <div className="vital-row xp-row">
            <span>XP</span>
            <div className="bar-track" aria-hidden="true">
              <div className="bar-fill xp-fill" style={{ width: `${xpPercent}%` }} />
            </div>
            <strong>{Math.round(xpPercent)}%</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function IdentityStrip({ pokemon }: { pokemon: PokemonDetailView }) {
  return (
    <section className="identity-strip" aria-label="Identidade do Pokémon">
      <div>
        <span className="detail-label">Tipo</span>
        <div className="type-list">
          {pokemon.types.map((type) => (
            <span className="type-pill type-fire" key={type}>
              {type}
            </span>
          ))}
        </div>
      </div>
      <div>
        <span className="detail-label">Nature</span>
        <strong>{pokemon.nature}</strong>
      </div>
      <div>
        <span className="detail-label">Ability</span>
        <strong>{pokemon.ability}</strong>
      </div>
      <div>
        <span className="detail-label">Condição</span>
        <strong>{pokemon.status || 'Saudável'}</strong>
      </div>
    </section>
  );
}

function MovesSection({ pokemon }: { pokemon: PokemonDetailView }) {
  return (
    <section className="content-section" aria-labelledby="moves-title">
      <div className="section-heading">
        <div>
          <span className="section-number">01</span>
          <h2 id="moves-title">Golpes</h2>
        </div>
        <span className="section-note">4 equipados</span>
      </div>
      <div className="move-list">
        {pokemon.moves.map((move, index) => (
          <article className="move-row" key={move.name}>
            <span className="move-index">0{index + 1}</span>
            <div className="move-main">
              <strong>{move.name}</strong>
              <span>
                {move.type} · {move.category === 'physical' ? 'Físico' : move.category === 'special' ? 'Especial' : 'Status'}
              </span>
            </div>
            <div className="move-pp">
              <span>PP</span>
              <strong>
                {move.pp.current}/{move.pp.max}
              </strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatsSection({ pokemon }: { pokemon: PokemonDetailView }) {
  const maxStat = Math.max(...Object.values(pokemon.stats), 1);
  return (
    <section className="content-section stats-section" aria-labelledby="stats-title">
      <div className="section-heading">
        <div>
          <span className="section-number">02</span>
          <h2 id="stats-title">Atributos</h2>
        </div>
        <span className="section-note">IVs em detalhe</span>
      </div>
      <div className="stats-grid">
        {(Object.keys(pokemon.stats) as Array<keyof typeof pokemon.stats>).map((key) => (
          <div className="stat-line" key={key}>
            <span>{statLabels[key]}</span>
            <div className="stat-track" aria-hidden="true">
              <div className="stat-fill" style={{ width: `${(pokemon.stats[key] / maxStat) * 100}%` }} />
            </div>
            <strong>{pokemon.stats[key]}</strong>
            <small>IV {pokemon.ivs[key]}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function OriginSection({ pokemon }: { pokemon: PokemonDetailView }) {
  return (
    <section className="origin-card" aria-label="Origem">
      <div className="origin-symbol" aria-hidden="true">
        ◉
      </div>
      <div>
        <span className="detail-label">Origem</span>
        <strong>{pokemon.capture.location}</strong>
        <p>{pokemon.capture.dateLabel}</p>
      </div>
      <span className="ball-label">{pokemon.capture.ball}</span>
    </section>
  );
}

export function PokemonDetailPage() {
  const pokemon = demoCharmander;

  return (
    <main className="pokemon-detail-page">
      <DetailHero pokemon={pokemon} />
      <div className="pokemon-detail-content">
        <IdentityStrip pokemon={pokemon} />
        <MovesSection pokemon={pokemon} />
        <StatsSection pokemon={pokemon} />
        <OriginSection pokemon={pokemon} />
      </div>
    </main>
  );
}
