import { useState } from 'react';
import { GenerationsPokemonViewer } from './GenerationsPokemonViewer';
import './generations-lab.css';

const starters = [
  { slug: 'bulbasaur', name: 'Bulbasaur', dex: 1, type: 'GRASS · POISON' },
  { slug: 'charmander', name: 'Charmander', dex: 4, type: 'FIRE' },
  { slug: 'squirtle', name: 'Squirtle', dex: 7, type: 'WATER' },
] as const;

export function GenerationsLabPage() {
  const [activeSlug, setActiveSlug] = useState<(typeof starters)[number]['slug']>('charmander');
  const active = starters.find((starter) => starter.slug === activeSlug) ?? starters[1];

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

      <nav className="starter-switcher" aria-label="Escolher starter para testar">
        {starters.map((starter) => (
          <button
            key={starter.slug}
            type="button"
            className={starter.slug === active.slug ? 'is-active' : ''}
            onClick={() => setActiveSlug(starter.slug)}
          >
            <span>#{String(starter.dex).padStart(3, '0')}</span>
            <strong>{starter.name}</strong>
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
            <strong>Generations Gen 1 · pipeline automático</strong>
            <span>GLB + materiais bakeados + Idle/Happy TRANM</span>
          </div>
        </div>

        <GenerationsPokemonViewer key={active.slug} species={active.slug} name={active.name} />
        <p className="gesture-hint">Toque curto = Happy · arraste = girar · roda ou pinça = zoom</p>
      </section>

      <p className="lab-note">
        Só um WebGL existe por vez. Trocar de Pokémon desmonta e libera o viewer anterior. Esta página
        valida o pipeline genérico antes da auditoria e conversão em lote da National Dex #001–386.
      </p>
    </main>
  );
}
