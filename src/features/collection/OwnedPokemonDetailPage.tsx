import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import { getOwnedPokemonDetailPreview, getOwnedPokemonNeighbours } from './ownedPokemonDetailPreview';
import './owned-pokemon-detail.css';

function SideArrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OwnedPokemonDetailPage({ instanceId }: { instanceId: string }) {
  const pokemon = getOwnedPokemonDetailPreview(instanceId);

  if (!pokemon) {
    return (
      <main className="owned-detail-page">
        <section className="owned-detail-not-found">
          <span>REGISTRO INDISPONÍVEL</span>
          <h1>Pokémon não encontrado.</h1>
          <a href="/pokemon" data-nav-mode="up">VOLTAR À COLEÇÃO</a>
        </section>
      </main>
    );
  }

  const neighbours = getOwnedPokemonNeighbours(instanceId);
  const dex = String(pokemon.dex).padStart(3, '0');

  return (
    <main className="owned-detail-page">
      <header className="owned-detail-header">
        <a href="/pokemon" data-nav-mode="up" className="owned-detail-back">
          <span aria-hidden="true">←</span>
          <span><strong>MEUS POKÉMON</strong><small>COLEÇÃO DO TREINADOR</small></span>
        </a>
        <div><small>INSTÂNCIA</small><strong>{pokemon.instanceId}</strong></div>
      </header>

      <section className="owned-detail-shell">
        <div className="owned-detail-stage">
          <div className="owned-detail-stage-meta">
            <span>NATIONAL #{dex}</span>
            <span>{pokemon.teamSlot ? `TIME · SLOT ${pokemon.teamSlot}` : pokemon.box.toUpperCase()}</span>
          </div>

          <div className="owned-detail-artwork">
            <PokemonAssetImage
              dex={pokemon.dex}
              role="official-artwork"
              alt={`Ilustração de ${pokemon.species}`}
              fallbackLabel={pokemon.species.slice(0, 1)}
              decoding="async"
            />
          </div>

          <nav className="owned-pokemon-side-nav" aria-label="Pokémon anterior e próximo na coleção">
            {neighbours.previous ? (
              <a href={`/pokemon/${neighbours.previous.instanceId}`} className="is-previous" aria-label={`Abrir ${neighbours.previous.nickname}`}>
                <SideArrow direction="left" />
                <span>{neighbours.previous.nickname}</span>
              </a>
            ) : <span />}
            {neighbours.next ? (
              <a href={`/pokemon/${neighbours.next.instanceId}`} className="is-next" aria-label={`Abrir ${neighbours.next.nickname}`}>
                <span>{neighbours.next.nickname}</span>
                <SideArrow direction="right" />
              </a>
            ) : <span />}
          </nav>

          <div className="owned-detail-identity">
            <span>{pokemon.shiny ? 'SHINY · ' : ''}{pokemon.favorite ? 'FAVORITO · ' : ''}POKÉMON POSSUÍDO</span>
            <h1>{pokemon.nickname}</h1>
            {pokemon.nickname !== pokemon.species && <p>{pokemon.species}</p>}
            <div className="owned-detail-types">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type} accent={typeAccent(type)} />
              ))}
            </div>
          </div>
        </div>

        <div className="owned-detail-data">
          <div className="owned-detail-tabs" aria-label="Seções do Pokémon">
            <a href="#resumo">RESUMO</a>
            <a href="#build">BUILD</a>
            <a href="#historico">HISTÓRICO</a>
          </div>

          <section id="resumo" className="owned-detail-section">
            <header><span>RESUMO</span><strong>NV. {pokemon.level}</strong></header>
            <dl className="owned-detail-facts">
              <div><dt>ESPÉCIE</dt><dd>{pokemon.species}</dd></div>
              <div><dt>SEXO</dt><dd>{pokemon.sex}</dd></div>
              <div><dt>BOX</dt><dd>{pokemon.box}</dd></div>
              <div><dt>TIME</dt><dd>{pokemon.teamSlot ? `Slot ${pokemon.teamSlot}` : 'Fora do Time'}</dd></div>
              <div><dt>SHINY</dt><dd>{pokemon.shiny ? 'Sim' : 'Não'}</dd></div>
              <div><dt>FAVORITO</dt><dd>{pokemon.favorite ? 'Sim' : 'Não'}</dd></div>
            </dl>
            <a className="owned-detail-species-link" href={`/pokedex/${dex}`}>
              VER ESPÉCIE NA POKÉDEX <strong>#{dex} →</strong>
            </a>
          </section>

          <section id="build" className="owned-detail-section owned-detail-build">
            <header><span>BUILD</span><strong>ESTRUTURA READ-ONLY</strong></header>
            <div className="owned-detail-build-core">
              <div><span>NATUREZA</span><strong>{pokemon.nature}</strong></div>
              <div><span>HABILIDADE</span><strong>{pokemon.ability}</strong></div>
              <div><span>ITEM</span><strong>{pokemon.heldItem}</strong></div>
            </div>
            <div className="owned-detail-moves">
              {pokemon.moves.length > 0 ? pokemon.moves.map((move) => (
                <article key={move.name}>
                  <TypeBadge type={move.type} accent={typeAccent(move.type)} compact />
                  <strong>{move.name}</strong>
                  <span>PP {move.pp}</span>
                </article>
              )) : <div className="owned-detail-empty-block">Golpes ainda não integrados.</div>}
            </div>
          </section>

          <section id="historico" className="owned-detail-section">
            <header><span>HISTÓRICO</span><strong>BACKEND PENDENTE</strong></header>
            <div className="owned-detail-history-row">
              <span>ORIGEM REGISTRADA</span>
              <strong>{pokemon.origin}</strong>
            </div>
            <p className="owned-detail-runtime-note">
              Captura, evolução, marcos e memórias só aparecerão aqui quando o RPG persistir esses eventos. O frontend não inventa histórico.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
