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

const rigFacts: Record<StarterId, string> = {
  1: '56 bones · 9 clips nativos',
  4: '45 bones · 0 clips · idle esquelético próprio',
  7: '26 bones · 0 clips · idle esquelético próprio',
};

const providerPlan = [
  ['3D', 'Pokémon 3D API', 'GLB otimizado + skeleton preservado'],
  ['Motion', 'Pokémon Hub', 'clips nativos quando existirem; idle esquelético quando faltarem'],
  ['Artwork', 'PokéAPI', 'fallback apenas quando o 3D realmente falhar'],
  ['Portrait', 'PMD Collab', 'Normal / Happy / Angry / Pain'],
  ['Fallback', 'Pokémon Showdown', 'sprite animado final da cadeia 2D'],
] as const;

export function AssetLabPage() {
  const [selectedId, setSelectedId] = useState<StarterId>(4);
  const [emotion, setEmotion] = useState<PortraitEmotion>('Normal');
  const pokemon = getStarterVisual(selectedId);
  const usesProceduralIdle = selectedId === 4 || selectedId === 7;

  return (
    <main className="shell asset-lab">
      <header className="lab-header">
        <div>
          <p className="eyebrow">ANIMATION COVERAGE LAB · 001 / 004 / 007</p>
          <h1>Um modelo parado não basta.</h1>
          <p className="hero-copy">
            Aqui só avaliamos o 3D vivo. Bulbasaur usa animações do próprio GLB; Charmander e
            Squirtle usam o rig preservado para receber movimento esquelético do Hub.
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
          </div>

          {usesProceduralIdle ? (
            <ProceduralPokemonViewer key={`procedural-${pokemon.id}`} pokemon={pokemon} />
          ) : (
            <PokemonModelViewer
              key={`source-${pokemon.id}`}
              pokemon={pokemon}
              forceFallback={false}
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
              Representação expressiva complementar; não substitui o 3D nesta avaliação.
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
          <h2>O 3D principal precisa parecer uma criatura, não um boneco de catálogo.</h2>
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
        Spike técnico: se o idle próprio não for claramente perceptível e natural, ele é rejeitado.
        Imagem estática não conta como alternativa nesta etapa.
      </p>
    </main>
  );
}
