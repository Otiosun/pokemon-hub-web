import { GenerationsCharmanderViewer } from './GenerationsCharmanderViewer';

export function GenerationsLabPage() {
  return (
    <main className="shell generations-lab">
      <header className="generations-header">
        <div>
          <p className="eyebrow">PROVIDER BENCHMARK · GENERATIONS</p>
          <h1>Agora é uma animação de verdade.</h1>
          <p className="hero-copy">
            O modelo e os movimentos abaixo vieram do mesmo pack. Nada de T-pose com seno: o idle
            possui 91 frames autorais a 60 FPS, com cabeça, braços, torso e seis segmentos da cauda.
          </p>
        </div>
        <a className="text-link" href="/asset-lab">
          ← Asset Lab atual
        </a>
      </header>

      <section className="generations-card">
        <div className="generations-title-row">
          <div>
            <p className="card-kicker">#004 · FIRE</p>
            <h2>Charmander</h2>
          </div>
          <div className="generations-proof">
            <strong>Generations Gen 1 · v3.1</strong>
            <span>GLB rigado + TRANM autoral · convertido no build</span>
          </div>
        </div>

        <GenerationsCharmanderViewer />
        <p className="gesture-hint">Arraste para girar · roda ou pinça para zoom</p>
      </section>

      <section className="generations-facts">
        <article>
          <strong>45</strong>
          <span>tracks no idle</span>
        </article>
        <article>
          <strong>91</strong>
          <span>frames</span>
        </article>
        <article>
          <strong>60</strong>
          <span>FPS</span>
        </article>
        <article>
          <strong>1,5 s</strong>
          <span>loop autoral</span>
        </article>
      </section>

      <p className="lab-note">
        Esta página é somente um benchmark técnico. Se o Charmander finalmente parecer vivo aqui,
        repetimos a mesma conversão em Bulbasaur e Squirtle e depois medimos cobertura do pack Gen
        1–3 antes de promover qualquer provider.
      </p>
    </main>
  );
}
