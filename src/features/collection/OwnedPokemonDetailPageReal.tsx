import { useMemo, useState } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { OwnedPokemonImage } from '../../visual-assets/PokemonPreviewImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { GenerationsPokemonViewer } from '../asset-lab/GenerationsPokemonViewer';
import { OwnedPokemonShiny3dViewer } from './OwnedPokemonShiny3dViewer';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import {
  readPokemonVisualPreference,
  rememberPokemonVisualPreference,
} from '../pokemon-detail/pokemonVisualPreference';
import { createOwnedPokemonView, findOwnedPokemonView, type OwnedPokemonSex } from './ownedPokemonView';
import { useOwnedPokemonCollection } from './useOwnedPokemonCollection';
import './owned-pokemon-detail.css';
import './owned-pokemon-detail-menu.css';

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

function sexLabel(sex: OwnedPokemonSex) {
  if (sex === 'M') return 'Macho';
  if (sex === 'F') return 'Fêmea';
  return 'Sem registro';
}

function sexGlyph(sex: OwnedPokemonSex) {
  if (sex === 'M') return '♂';
  if (sex === 'F') return '♀';
  return '—';
}

function conditionLabel(condition: string) {
  const labels: Record<string, string> = {
    BURN: 'QUEIMADO',
    POISON: 'ENVENENADO',
    BAD_POISON: 'TOXIC',
    PARALYSIS: 'PARALISADO',
    SLEEP: 'DORMINDO',
    FREEZE: 'CONGELADO',
  };
  return labels[condition] ?? condition.replaceAll('_', ' ');
}

function ownedStatusLabel(record: {
  fainted: boolean;
  conditions: readonly string[];
}) {
  if (record.fainted) return 'CAÍDO';
  if (record.conditions.length > 0) return record.conditions.map(conditionLabel).join(' · ');
  return 'OK';
}

function ivLabel(value: number | null) {
  return value === null ? '—' : String(value);
}

function resolveOwnedReturnHref(returnHref: string) {
  const params = new URLSearchParams(window.location.search);
  return params.get('origin') === 'journey-lead' ? '/jornada?pokemonContext=lead' : returnHref;
}

function RecordUnavailable({ returnHref, message }: { returnHref: string; message: string }) {
  return (
    <main className="owned-detail-page">
      <HubModuleHeader module="pokemon" metaLabel="REGISTRO" metaValue="INDISPONÍVEL" />
      <section className="owned-detail-not-found">
        <span>REGISTRO INDISPONÍVEL</span>
        <h1>{message}</h1>
        <a href={returnHref} data-nav-mode="up">VOLTAR AO CONTEXTO</a>
      </section>
    </main>
  );
}

export function OwnedPokemonDetailPage({
  instanceId,
  returnHref = '/pokemon',
}: {
  instanceId: string;
  returnHref?: string;
}) {
  const [visualMode, setVisualMode] = useState<OwnedVisualMode>(() =>
    readPokemonVisualPreference('2d'),
  );
  const [viewerReady, setViewerReady] = useState(false);
  const collection = useOwnedPokemonCollection();
  const pokemon = useMemo(
    () =>
      collection.status === 'authenticated'
        ? createOwnedPokemonView(collection.pokemon)
        : [],
    [collection],
  );
  const record = findOwnedPokemonView(pokemon, instanceId);
  const resolvedReturnHref = resolveOwnedReturnHref(returnHref);

  const chooseVisualMode = (mode: OwnedVisualMode) => {
    if (mode === '3d') setViewerReady(false);
    setVisualMode(mode);
    rememberPokemonVisualPreference(mode);
  };

  if (collection.status === 'loading') {
    return <RecordUnavailable returnHref={resolvedReturnHref} message="Sincronizando registro oficial…" />;
  }
  if (collection.status !== 'authenticated') {
    return <RecordUnavailable returnHref={resolvedReturnHref} message="Sessão do treinador indisponível." />;
  }
  if (!record) {
    return <RecordUnavailable returnHref={resolvedReturnHref} message="Pokémon não encontrado na sua coleção." />;
  }

  const index = pokemon.findIndex((item) => item.instanceId === instanceId);
  const previous = index > 0 ? pokemon[index - 1] : null;
  const next = index >= 0 && index < pokemon.length - 1 ? pokemon[index + 1] : null;
  const dex = record.dex === null ? null : String(record.dex).padStart(3, '0');
  const returningToTeam = resolvedReturnHref === '/team' || resolvedReturnHref.startsWith('/team?');
  const returningToJourney =
    resolvedReturnHref === '/jornada' || resolvedReturnHref.startsWith('/jornada?');
  const returnLabel = returningToTeam ? 'TIME' : returningToJourney ? 'JORNADA' : 'BOX';
  const locationLabel = record.teamSlot ? `TIME · SLOT ${record.teamSlot}` : record.box;
  const speciesSlug = record.catalogResolved ? speciesAssetSlug(record.species) : null;
  const identityLine = record.catalogResolved
    ? `${record.nickname === record.species ? '' : `${record.species} · `}#${dex} · NV. ${record.level} · ${sexLabel(record.sex)}`
    : `CATÁLOGO INDISPONÍVEL · NV. ${record.level} · ${sexLabel(record.sex)}`;

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
              <button type="button" aria-pressed={visualMode === '2d'} onClick={() => chooseVisualMode('2d')}>
                2D
              </button>
              <button
                type="button"
                disabled={!speciesSlug}
                aria-pressed={visualMode === '3d'}
                onClick={() => chooseVisualMode('3d')}
              >
                3D
              </button>
            </fieldset>
            <HubMenuTrigger />
          </div>

          <div className={`owned-detail-visual${visualMode === '3d' ? ' is-3d' : ''}`}>
            {visualMode === '3d' && speciesSlug ? (
              <div className="owned-detail-viewer is-ready" aria-busy={!viewerReady}>
                {record.shiny && record.dex !== null ? (
                  <OwnedPokemonShiny3dViewer
                    dex={record.dex}
                    name={record.species}
                    onReadyChange={setViewerReady}
                    onFailed={() => {
                      setViewerReady(false);
                      setVisualMode('2d');
                    }}
                  />
                ) : (
                  <GenerationsPokemonViewer
                    species={speciesSlug}
                    name={record.species}
                    onReadyChange={setViewerReady}
                    onFailedSpeciesChange={() => {
                      setViewerReady(false);
                      setVisualMode('2d');
                    }}
                  />
                )}
              </div>
            ) : record.dex !== null ? (
              <div className="owned-detail-artwork">
                <OwnedPokemonImage
                  dex={record.dex}
                  assetRole="official-artwork"
                  shiny={record.shiny}
                  alt={`Ilustração de ${record.species}`}
                  fallbackLabel={record.species.slice(0, 1)}
                  decoding="async"
                />
              </div>
            ) : (
              <div className="owned-detail-artwork"><strong aria-hidden="true">?</strong></div>
            )}
          </div>

          <nav className="owned-pokemon-side-nav" aria-label="Pokémon anterior e próximo na coleção">
            {previous ? (
              <a href={`/pokemon/${previous.instanceId}`} className="is-previous" aria-label={`Abrir ${previous.nickname}`}>
                <SideArrow direction="left" />
                {previous.dex !== null ? (
                  <OwnedPokemonImage dex={previous.dex} assetRole="icon" shiny={previous.shiny} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                ) : <strong aria-hidden="true">?</strong>}
                <span><small>ANTERIOR</small><strong>{previous.nickname}</strong></span>
              </a>
            ) : <span />}
            {next ? (
              <a href={`/pokemon/${next.instanceId}`} className="is-next" aria-label={`Abrir ${next.nickname}`}>
                <span><small>PRÓXIMO</small><strong>{next.nickname}</strong></span>
                {next.dex !== null ? (
                  <OwnedPokemonImage dex={next.dex} assetRole="icon" shiny={next.shiny} alt="" aria-hidden="true" loading="lazy" decoding="async" />
                ) : <strong aria-hidden="true">?</strong>}
                <SideArrow direction="right" />
              </a>
            ) : <span />}
          </nav>

          <div className="owned-detail-location-chip"><span>{locationLabel}</span></div>
        </div>

        <div className="owned-detail-data">
          <header className="owned-detail-record-head">
            <div>
              <span>REGISTRO DO POKÉMON</span>
              <h1>{record.nickname}</h1>
              <p>{identityLine}</p>
            </div>
            <fieldset
              className="owned-detail-record-state"
              aria-label="Estado do Pokémon"
              style={{ minWidth: 0, margin: 0, padding: 0, border: 0 }}
            >
              {record.shiny ? <strong>SHINY</strong> : null}
              {record.fainted ? <strong>CAÍDO</strong> : null}
              {!record.fainted && record.conditions.length > 0 ? (
                <strong>{record.conditions.map(conditionLabel).join(' · ')}</strong>
              ) : null}
            </fieldset>
          </header>

          <section className="owned-detail-tab-panel" aria-label="Resumo autoritativo do Pokémon">
            <dl className="owned-detail-facts">
              <div className="is-wide">
                <dt>TIPO</dt>
                <dd className="owned-detail-types">
                  {record.types.length > 0
                    ? record.types.map((type) => (
                        <TypeBadge key={type} type={type} accent={typeAccent(type)} />
                      ))
                    : 'Indisponível'}
                </dd>
              </div>
              <div><dt>NÍVEL</dt><dd>{record.level}</dd></div>
              <div>
                <dt>XP</dt>
                <dd>
                  {record.xpToNextLevel > 0
                    ? `${record.xp} / ${record.xpToNextLevel}`
                    : 'NÍVEL MÁXIMO'}
                </dd>
              </div>
              <div>
                <dt>HP</dt>
                <dd>
                  {record.maxHp === null
                    ? record.currentHp
                    : `${record.currentHp} / ${record.maxHp}`}
                </dd>
              </div>
              <div><dt>ESTADO</dt><dd>{ownedStatusLabel(record)}</dd></div>
              <div><dt>NATURE</dt><dd>{record.nature ?? '—'}</dd></div>
              <div><dt>ABILITY</dt><dd>{record.ability ?? '—'}</dd></div>
              <div>
                <dt>SEXO</dt>
                <dd><span className="owned-detail-sex">{sexGlyph(record.sex)}</span> {sexLabel(record.sex)}</dd>
              </div>
              <div><dt>SHINY</dt><dd>{record.shiny ? 'Sim' : 'Não'}</dd></div>
              <div className="is-wide"><dt>LOCAL ATUAL</dt><dd>{locationLabel}</dd></div>
            </dl>

            <dl className="owned-detail-combat-core" aria-label="Valores individuais">
              <div className="is-wide"><dt>IVs</dt><dd>VALORES INDIVIDUAIS</dd></div>
              <div><dt>HP</dt><dd>{ivLabel(record.ivs.hp)}</dd></div>
              <div><dt>ATTACK</dt><dd>{ivLabel(record.ivs.attack)}</dd></div>
              <div><dt>DEFENSE</dt><dd>{ivLabel(record.ivs.defense)}</dd></div>
              <div><dt>SP. ATK</dt><dd>{ivLabel(record.ivs.spAttack)}</dd></div>
              <div><dt>SP. DEF</dt><dd>{ivLabel(record.ivs.spDefense)}</dd></div>
              <div><dt>SPEED</dt><dd>{ivLabel(record.ivs.speed)}</dd></div>
            </dl>

            <section className="owned-detail-moves" aria-label="Movimentos atuais">
              <header>
                <span>MOVIMENTOS</span>
                <small>PP ATUAL / MÁX.</small>
              </header>
              {record.moves.length > 0 ? (
                record.moves.map((move) => (
                  <article key={move.slotNo}>
                    <span>{String(move.slotNo).padStart(2, '0')}</span>
                    <strong>{move.displayName ?? 'MOVIMENTO INDISPONÍVEL'}</strong>
                    <span>
                      {move.ppCurrent === null || move.maxPp === null
                        ? 'PP —'
                        : `PP ${move.ppCurrent}/${move.maxPp}`}
                    </span>
                  </article>
                ))
              ) : (
                <div className="owned-detail-empty-block">Nenhum movimento registrado.</div>
              )}
            </section>

            {dex !== null ? (
              <a className="owned-detail-species-link" href={`/pokedex/${dex}`}>
                <span><small>ESPÉCIE</small><strong>VER {record.species.toUpperCase()} NA POKÉDEX</strong></span>
                <span aria-hidden="true">→</span>
              </a>
            ) : (
              <div className="owned-detail-history-empty">Apresentação da espécie indisponível na release atual.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
