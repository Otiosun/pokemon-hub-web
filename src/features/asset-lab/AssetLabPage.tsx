import { useState } from 'react';
import {
  getStarterVisual,
  starterVisuals,
  type PortraitEmotion,
  type StarterId,
} from '../../visual-assets/starterManifest';
import { PokemonModelViewer } from './PokemonModelViewer';
import { ProceduralPokemonViewer } from './ProceduralPokemonViewer';

const emotions: readonly PortraitEmotion[] = ['Normal', 'Happy', 'Angry', 'Pain'];
type ViewerMode = 'source' | 'procedural';

const rigFacts: Record<StarterId, string> = {
  1: '56 bones · 9 clips nativos',
  4: '45 bones · 0 clips · idle próprio em teste',
  7: '26 bones · 0 clips · idle próprio em teste',
};

const providerPlan = [
  ['3D', 'Pokémon 3D API', 'GLB otimizado + skeleton preservado'],
  ['Motion', 'Pokémon Hub', 'clips nativos quando bons; idle esquelético quando faltarem'],
  ['Artwork', 'PokéAPI', 'HOME → Official Artwork'],
  ['Portrait', 'PMD Collab', 'Normal / Happy / Angry / Pain'],
  ['Fallback', 'Pokémon Showdown', 'sprite animado final da cadeia 2D'],
] as const;

export function AssetLabPage() {
  const [selectedId, setSelectedId] = useState<StarterId>(4);
  const [emotion, setEmotion] = useState<PortraitEmotion>('Normal');
  const [forceFallback, setForceFallback] = useState(false);
  const [viewerMode, setViewerMode] = useState<ViewerMode>('procedural');
  const pokemon = getStarterVisual(selectedId);
  const canUseProceduralIdle = selectedId === 4 || selectedId === 7;

  return (
    <main className="shell asset-lab">
      <header className="lab-header">
        <div>
          <p className="eyebrow">ANIMATION COVERAGE LAB · 001 / 004 / 007</p>
          <h1>Um modelo parado não basta.</h1>
          <p className="hero-copy">
            Agora testamos se cada Pokémon realmente parece vivo. Charmander e Squirtle mantêm o
            rig completo, então o Hub pode gerar um idle esquelético sem trocar a malha.
          </p>
        </div>
        <a className="text-link" href="/">
          ← início
        </a>
      </header>

      <nav className="starter-tabs" aria-label="Escolher Pokémon do laboratório">
        {starterVisuals.map((starter) => (
          <button
            type="button"
            key={starter.id}
            className={starter.id === selectedId ? 'starter-tab is-active' : 'starter-tab'}
            onClick={() => {
              setSelectedId(starter.id);
              setEmotion('Normal');
              setForceFallback(false);
              setViewerMode(starter.id === 1 ? 'source' : 'procedural');
            }}
          >
            <img src={starter.icon.url} alt="" aria-hidden="true" />
            <span>#{starter.dex}</span>
            <strong>{starter.name}</strong>
          </button>
        ))}
      </nav>

      <section className="lab-stage" aria-label={`Laboratório visual de ${pokemon.name}`}>
        <div className="stage-viewer">
          <div className="stage-heading">
            <div>
              <p className="card-kicker">
                #{pokemon.dex} · {pokemon.types.join(' / ')}
              </p>
              <h2>{pokemon.name}</h2>
              <p className="rig-fact">{rigFacts[pokemon.id]}</p>
            </div>
            <button
              type="button"
              className={forceFallback ? 'lab-toggle is-active' : 'lab-toggle'}
              onClick={() => setForceFallback((value) => !value)}
            >
              {forceFallback ? 'Restaurar visual' : 'Testar fallback'}
            </button>
          </div>

          {canUseProceduralIdle && !forceFallback && (
            <fieldset className="viewer-mode-switch">
              <legend className="sr-only">Comparar movimento 3D</legend>
              <button
                type="button"
                className={viewerMode === 'source' ? 'is-active' : ''}
                onClick={() => setViewerMode('source')}
              >
                Original estático
              </button>
              <button
                type="button"
                className={viewerMode === 'procedural' ? 'is-active' : ''}
                onClick={() => setViewerMode('procedural')}
              >
                Idle experimental
              </button>
            </fieldset>
          )}

          {viewerMode === 'procedural' && canUseProceduralIdle && !forceFallback ? (
            <ProceduralPokemonViewer key={`procedural-${pokemon.id}`} pokemon={pokemon} />
          ) : (
            <PokemonModelViewer
              key={`source-${pokemon.id}`}
              pokemon={pokemon}
              forceFallback={forceFallback}
            />
          )}
          <p className="gesture-hint">Arraste para girar · use a roda ou pinça para zoom</p>
        </div>

        <aside className="emotion-panel">
          <div className="portrait-frame">
            <img src={pokemon.portraits[emotion].url} alt={`${pokemon.name} — ${emotion}`} />
          </div>
          <div>
            <p className="card-kicker">PMD PORTRAIT</p>
            <h3>{emotion}</h3>
            <p className="emotion-copy">
              Uma segunda representação deixa o Pokémon expressivo sem depender do 3D.
            </p>
          </div>
          <section className="emotion-buttons" aria-label="Expressões">
            {emotions.map((item) => (
              <button
                type="button"
                key={item}
                className={item === emotion ? 'emotion-button is-active' : 'emotion-button'}
                onClick={() => setEmotion(item)}
              >
                {item}
              </button>
            ))}
          </section>
          <div className="fallback-preview">
            <span>Fallback animado</span>
            <img src={pokemon.animatedSprite.url} alt={`${pokemon.name} animado`} />
          </div>
        </aside>
      </section>

      <section className="pipeline-panel">
        <div>
          <p className="eyebrow">VISUAL ASSET SYSTEM</p>
          <h2>O melhor visual pode combinar asset externo com movimento nosso.</h2>
        </div>
        <div className="provider-list">
          {providerPlan.map(([kind, provider, use]) => (
            <div className="provider-row" key={kind}>
              <strong>{kind}</strong>
              <span>{provider}</span>
              <small>{use}</small>
            </div>
          ))}
        </div>
      </section>

      <p className="lab-note">
        Spike técnico: o idle procedural só será promovido se a deformação parecer natural em
        desktop e mobile. Caso contrário, o provider continua podendo ser trocado por espécie.
      </p>
    </main>
  );
}
