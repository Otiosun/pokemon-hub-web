import { useState } from 'react';
import { GenerationsPokemonViewer } from './GenerationsPokemonViewer';
import './generations-lab.css';

const samples = [
  { slug: 'bulbasaur', name: 'Bulbasaur', dex: 1, type: 'GRASS · POISON', format: 'TRANM' },
  { slug: 'charmander', name: 'Charmander', dex: 4, type: 'FIRE', format: 'TRANM' },
  { slug: 'squirtle', name: 'Squirtle', dex: 7, type: 'WATER', format: 'TRANM' },
  { slug: 'caterpie', name: 'Caterpie', dex: 10, type: 'BUG', format: 'GFBANM' },
  { slug: 'ledyba', name: 'Ledyba', dex: 165, type: 'BUG · FLYING', format: 'SMD' },
  { slug: 'rayquaza', name: 'Rayquaza', dex: 384, type: 'DRAGON · FLYING', format: 'FLYIDLE · TRANM' },
] as const;

export function GenerationsLabPage() {
  const [activeSlug, setActiveSlug] = useState<(typeof samples)[number]['slug']>('charmander');
  const active = samples.find((sample) => sample.slug === activeSlug) ?? samples[1];

  return (
    <main className="shell generations-lab">
      <header className="generations-header">
        <div>
          <p className="eyebrow">PROVIDER BENCHMARK · GENERATIONS</p>
          <h1>Idle vivo. Toque curto, reação Happy.</h1>
          <p className="hero-copy">
            Só duas animações entram no produto: Idle em loop e Happy uma vez por interação. Enquanto
            Happy toca, novos toques são ignorados; ao terminar, o Pokémon volta ao Idle.
          </p>
        </div>
        <a className="text-link" href="/asset-lab">
          ← Asset Lab atual
        </a>
      </header>

      <nav className="starter-switcher" aria-label="Escolher Pokémon para testar">
        {samples.map((sample) => (
          <button
            key={sample.slug}
            type="button"
            className={sample.slug === active.slug ? 'is-active' : ''}
            onClick={() => setActiveSlug(sample.slug)}
          >
            <span>#{String(sample.dex).padStart(3, '0')} · {sample.format}</span>
            <strong>{sample.name}</strong>
          </button>
        ))}
      </nav>

      <section className="generations-card">
        <div className="generations-title-row">
          <div>
            <p className="card-kicker">#{String(active.dex).padStart(3, '0')} · {active.type}</p>
            <h2>{active.name}</h2>
          </div>
          <div className="generations-proof">
            <strong>Generations · pipeline semântico automático</strong>
            <span>GLB + materiais bakeados + somente Idle/Happy · fonte {active.format}</span>
          </div>
        </div>

        <GenerationsPokemonViewer key={active.slug} species={active.slug} name={active.name} />
        <p className="gesture-hint">Toque curto = Happy · arraste = girar · roda ou pinça = zoom</p>
      </section>

      <p className="lab-note">
        Só um WebGL existe por vez. Bulbasaur/Charmander/Squirtle validam o produto; Caterpie, Ledyba e
        Rayquaza validam GFBANM, SMD e Idle semântico. Trocar de Pokémon desmonta e libera o viewer anterior.
      </p>
    </main>
  );
}
