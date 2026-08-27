import './journey-page.css';

export function JourneyPage() {
  return (
    <main className="journey-page">
      <section className="journey-intro">
        <p className="journey-eyebrow">JORNADA</p>
        <h1>Continue de onde parou.</h1>
        <p>
          O mundo fica no centro da experiência. Pokédex e Box entram como ferramentas quando você precisar delas,
          sem virar três aplicativos disputando sua atenção.
        </p>
      </section>

      <section className="journey-world-stage" aria-label="Jornada">
        <div className="journey-route-visual" aria-hidden="true">
          <span className="journey-orbit orbit-one" />
          <span className="journey-orbit orbit-two" />
          <span className="journey-route-line" />
          <i className="journey-node node-one" />
          <i className="journey-node node-two" />
          <i className="journey-node node-three" />
          <i className="journey-player-marker" />
        </div>
        <div className="journey-world-copy">
          <span>SEU MUNDO</span>
          <strong>A aventura é o ponto de partida.</strong>
          <p>Abra o menu apenas quando quiser consultar espécies ou organizar seus Pokémon.</p>
        </div>
      </section>
    </main>
  );
}
