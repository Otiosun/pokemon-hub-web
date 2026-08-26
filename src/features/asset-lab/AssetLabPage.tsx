import { useState } from 'react';
import {
  getStarterVisual,
  starterVisuals,
  type PortraitEmotion,
  type StarterId,
} from '../../visual-assets/starterManifest';
import { PokemonModelViewer } from './PokemonModelViewer';

const emotions: readonly PortraitEmotion[] = ['Normal', 'Happy', 'Angry', 'Pain'];

const providerPlan = [
  ['3D', 'Pokémon 3D API', 'GLB otimizado + clips embutidos quando existirem'],
  ['Artwork', 'PokéAPI', 'HOME → Official Artwork'],
  ['Portrait', 'PMD Collab', 'Normal / Happy / Angry / Pain'],
  ['Icon', 'PokéAPI', 'ícone leve para provar a função de Box'],
  ['Fallback', 'Pokémon Showdown', 'sprite animado final da cadeia 2D'],
] as const;

export function AssetLabPage() {
  const [selectedId, setSelectedId] = useState<StarterId>(4);
  const [emotion, setEmotion] = useState<PortraitEmotion>('Normal');
  const [forceFallback, setForceFallback] = useState(false);
  const pokemon = getStarterVisual(selectedId);

  return (
    <main className="shell asset-lab">
      <header className="lab-header">
        <div>
          <p className="eyebrow">ASSET LAB · 001 / 004 / 007</p>
          <h1>Agora os Pokémon são reais.</h1>
          <p className="hero-copy">
            Este laboratório testa o pipeline visual antes de desenharmos Time, Box e Pokédex.
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
            </div>
            <button
              type="button"
              className={forceFallback ? 'lab-toggle is-active' : 'lab-toggle'}
              onClick={() => setForceFallback((value) => !value)}
            >
              {forceFallback ? 'Restaurar 3D' : 'Simular falha 3D'}
            </button>
          </div>

          <PokemonModelViewer
            key={pokemon.id}
            pokemon={pokemon}
            forceFallback={forceFallback}
          />
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
          <div className="emotion-buttons" role="group" aria-label="Expressões">
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
          </div>
          <div className="fallback-preview">
            <span>Fallback animado</span>
            <img src={pokemon.animatedSprite.url} alt={`${pokemon.name} animado`} />
          </div>
        </aside>
      </section>

      <section className="pipeline-panel">
        <div>
          <p className="eyebrow">VISUAL ASSET SYSTEM</p>
          <h2>Uma espécie, várias representações. A UI não conhece a origem delas.</h2>
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
        Spike técnico: ainda não é a página final do Pokémon. O objetivo aqui é quebrar assets,
        medir cobertura e descobrir limitações antes de investir no design definitivo.
      </p>
    </main>
  );
}
