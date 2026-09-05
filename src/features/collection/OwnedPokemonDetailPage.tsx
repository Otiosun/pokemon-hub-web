import { useState } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import {
  getOwnedPokemonDetailPreview,
  getOwnedPokemonNeighbours,
  isJourneyLeadInstance,
} from './ownedPokemonDetailPreview';
import './owned-pokemon-detail.css';
import './owned-pokemon-detail-menu.css';

type OwnedDetailTab = 'summary' | 'combat' | 'history';
type OwnedVisualMode = '2d' | '3d';

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

function speciesAssetSlug(species: string) {
  return species
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sexLabel(sex: string) {
  if (sex === 'M') return 'Macho';
  if (sex === 'F') return 'Fêmea';
  return 'Sem registro';
}

function sexGlyph(sex: string) {
  if (sex === 'M') return '♂';
  if (sex === 'F') return '♀';
  return '—';
}

function resolveOwnedReturnHref(returnHref: string, instanceId: string) {
  const params = new URLSearchParams(window.location.search);
  return params.get('origin') === 'journey-lead' && isJourneyLeadInstance(instanceId)
    ? '/jornada?pokemonContext=lead'
    : returnHref;
}

export function OwnedPokemonDetailPage({
  instanceId,
  returnHref = '/pokemon',
}: {
  instanceId: string;
  returnHref?: string;
}) {
  const [activeTab, setActiveTab] = useState<OwnedDetailTab>('summary');
  const [visualMode, setVisualMode] = useState<OwnedVisualMode>('3d');
  const [viewerReady, setViewerReady] = useState(false);
  const pokemon = getOwnedPokemonDetailPreview(instanceId);
  const resolvedReturnHref = resolveOwnedReturnHref(returnHref, instanceId);

  if (!pokemon) {
    return (
      <main className="owned-detail-page">
        <HubModuleHeader module="pokemon" metaLabel="REGISTRO" metaValue="INDISPONÍVEL" />
        <section className="owned-detail-not-found">
          <span>REGISTRO INDISPONÍVEL</span>
          <h1>Pokémon não encontrado.</h1>
          <a href={resolvedReturnHref} data-nav-mode="up">VOLTAR AO CONTEXTO</a>
        </section>
      </main>
    );
  }

  const neighbours = getOwnedPokemonNeighbours(instanceId, resolvedReturnHref);
  const dex = String(pokemon.dex).padStart(3, '0');
  const returningToTeam = resolvedReturnHref === '/team' || resolvedReturnHref.startsWith('/team?');
  const returningToJourney =
    resolvedReturnHref === '/jornada' || resolvedReturnHref.startsWith('/jornada?');
  const returnLabel = returningToTeam ? 'TIME' : returningToJourney ? 'JORNADA' : 'BOX';
  const locationLabel = pokemon.teamSlot
    ? `TIME · SLOT ${pokemon.teamSlot}`
    : pokemon.box.toUpperCase();
  const speciesSlug = speciesAssetSlug(pokemon.species);
  const identityLine = pokemon.nickname === pokemon.species
    ? `#${dex} · NV. ${pokemon.level} · ${sexLabel(pokemon.sex)}`
    : `${pokemon.species} · #${dex} · NV. ${pokemon.level} · ${sexLabel(pokemon.sex)}`;

  return (
    <main className="owned-detail-page">
      <section className="owned-detail-shell">
        <div className="owned-detail-stage">
          <div className="owned-detail-stage-grid" aria-hidden="true" />
          <div className="owned-detail-ruler" aria-hidden="true"><strong>HEIGHT</strong></div>

          <a href={resolvedReturnHref} data-nav-mode="up" className="owned-detail-stage-back">
            <SideArrow direction="left" />
            <span>{returnLabel}</span>
          </a>

          <div className="owned-detail-stage-actions">
            <fieldset className="owned-detail-view-switch" aria-label="Visual do Pokémon">
              <button
                type="button"
                aria-pressed={visualMode === '2d'}
                onClick={() => {
                  setViewerReady(false);
                  setVisualMode('2d');
                }}
              >
                2D
              </button>
              <button
                type="button"
                aria-pressed={visualMode === '3d'}
                onClick={() => {
                  setViewerReady(false);
                  setVisualMode('3d');
                }}
              >
                3D
              </button>
            </fieldset>
            <HubMenuTrigger />
          </div>

          <div className={`owned-detail-visual${visualMode === '3d' ? ' is-3d' : ''}`}>
            {visualMode === '2d' ? (
              <div className="owned-detail-artwork">
                <PokemonAssetImage
                  dex={pokemon.dex}
                  assetRole="official-artwork"
                  alt={`Ilustração de ${pokemon.species}`}
                  fallbackLabel={pokemon.species.slice(0, 1)}
                  decoding="async"
                />
              </div>
            ) : (
              <div className="owned-detail-viewer is-ready" aria-busy={!viewerReady}>
                <GenerationsPokemonViewer
                  species={speciesSlug}
                  name={pokemon.species}
                  onReadyChange={setViewerReady}
                  onFailedSpeciesChange={() => {
                    setViewerReady(false);
                    setVisualMode('2d');
                  }}
                />
              </div>
            )}
          </div>

          <nav className="owned-pokemon-side-nav" aria-label="Pokémon anterior e próximo no contexto atual">
            {neighbours.previous ? (
              <a
                href={`/pokemon/${neighbours.previous.instanceId}`}
                className="is-previous"
                aria-label={`Abrir ${neighbours.previous.nickname}`}
              >
                <SideArrow direction="left" />
                <PokemonAssetImage
                  dex={neighbours.previous.dex}
                  assetRole="icon"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />
                <span>
                  <small>ANTERIOR</small>
                  <strong>{neighbours.previous.nickname}</strong>
                </span>
              </a>
            ) : <span />}
            {neighbours.next ? (
              <a
                href={`/pokemon/${neighbours.next.instanceId}`}
                className="is-next"
                aria-label={`Abrir ${neighbours.next.nickname}`}
              >
                <span>
                  <small>PRÓXIMO</small>
                  <strong>{neighbours.next.nickname}</strong>
                </span>
                <PokemonAssetImage
                  dex={neighbours.next.dex}
                  assetRole="icon"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />
                <SideArrow direction="right" />
              </a>
            ) : <span />}
          </nav>

          <div className="owned-detail-location-chip">
            <span>{locationLabel}</span>
          </div>
        </div>

        <div className="owned-detail-data">
          <header className="owned-detail-record-head">
            <div>
              <span>REGISTRO DO POKÉMON</span>
              <h1>{pokemon.nickname}</h1>
              <p>{identityLine}</p>
            </div>
            <fieldset
              className="owned-detail-record-state"
              aria-label="Estado do Pokémon"
              style={{ minWidth: 0, margin: 0, padding: 0, border: 0 }}
            >
              {pokemon.favorite ? <span title="Favorito" role="img" aria-label="Favorito">★</span> : null}
              {pokemon.shiny ? <strong>SHINY</strong> : null}
            </fieldset>
          </header>

          <div className="owned-detail-tabs" role="tablist" aria-label="Seções do Pokémon">
            <button
              id="owned-tab-summary"
              type="button"
              role="tab"
              aria-selected={activeTab === 'summary'}
              aria-controls="owned-panel-summary"
              onClick={() => setActiveTab('summary')}
            >
              RESUMO
            </button>
            <button
              id="owned-tab-combat"
              type="button"
              role="tab"
              aria-selected={activeTab === 'combat'}
              aria-controls="owned-panel-combat"
              onClick={() => setActiveTab('combat')}
            >
              COMBATE
            </button>
            <button
              id="owned-tab-history"
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              aria-controls="owned-panel-history"
              onClick={() => setActiveTab('history')}
            >
              HISTÓRICO
            </button>
          </div>

          {activeTab === 'summary' ? (
            <section
              id="owned-panel-summary"
              className="owned-detail-tab-panel"
              role="tabpanel"
              aria-labelledby="owned-tab-summary"
            >
              <dl className="owned-detail-facts">
                <div className="is-wide">
                  <dt>TIPO</dt>
                  <dd className="owned-detail-types">
                    {pokemon.types.map((type) => (
                      <TypeBadge key={type} type={type} accent={typeAccent(type)} />
                    ))}
                  </dd>
                </div>
                <div><dt>NÍVEL</dt><dd>{pokemon.level}</dd></div>
                <div><dt>SEXO</dt><dd><span className="owned-detail-sex">{sexGlyph(pokemon.sex)}</span> {sexLabel(pokemon.sex)}</dd></div>
                <div><dt>SHINY</dt><dd>{pokemon.shiny ? 'Sim' : 'Não'}</dd></div>
                <div><dt>FAVORITO</dt><dd>{pokemon.favorite ? 'Sim' : 'Não'}</dd></div>
                <div className="is-wide"><dt>LOCAL ATUAL</dt><dd>{locationLabel}</dd></div>
              </dl>

              <a className="owned-detail-species-link" href={`/pokedex/${dex}`}>
                <span>
                  <small>ESPÉCIE</small>
                  <strong>VER {pokemon.species.toUpperCase()} NA POKÉDEX</strong>
                </span>
                <span aria-hidden="true">→</span>
              </a>
            </section>
          ) : null}

          {activeTab === 'combat' ? (
            <section
              id="owned-panel-combat"
              className="owned-detail-tab-panel"
              role="tabpanel"
              aria-labelledby="owned-tab-combat"
            >
              <dl className="owned-detail-combat-core">
                <div><dt>NATUREZA</dt><dd>{pokemon.nature}</dd></div>
                <div><dt>HABILIDADE</dt><dd>{pokemon.ability}</dd></div>
                <div className="is-wide"><dt>ITEM</dt><dd>{pokemon.heldItem}</dd></div>
              </dl>

              <div className="owned-detail-moves">
                <header><span>GOLPES</span><small>{pokemon.moves.length}/4</small></header>
                {pokemon.moves.length > 0 ? pokemon.moves.map((move) => (
                  <article key={move.name}>
                    <TypeBadge type={move.type} accent={typeAccent(move.type)} compact />
                    <strong>{move.name}</strong>
                    <span>PP {move.pp}</span>
                  </article>
                )) : <p className="owned-detail-empty-block">Nenhum golpe registrado.</p>}
              </div>
            </section>
          ) : null}

          {activeTab === 'history' ? (
            <section
              id="owned-panel-history"
              className="owned-detail-tab-panel"
              role="tabpanel"
              aria-labelledby="owned-tab-history"
            >
              <div className="owned-detail-history-row">
                <span>ORIGEM</span>
                <strong>{pokemon.origin}</strong>
              </div>
              <p className="owned-detail-history-empty">Nenhum outro marco registrado para este Pokémon.</p>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
