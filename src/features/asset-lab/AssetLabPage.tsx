const starters = [
  { id: 1, name: 'Bulbasaur', type: 'Grass · Poison' },
  { id: 4, name: 'Charmander', type: 'Fire' },
  { id: 7, name: 'Squirtle', type: 'Water' },
] as const;

const providerPlan = [
  ['3D', 'Pokémon 3D API', 'GLB + animações quando disponíveis'],
  ['Artwork', 'PokéAPI', 'HOME / Official Artwork'],
  ['Portrait', 'PMD Collab', 'emoções e portraits'],
  ['Box', 'PokéSprite', 'ícones leves'],
  ['Battle', 'Pokémon Showdown', 'sprite animado de fallback'],
] as const;

export function AssetLabPage() {
  return (
    <main className="shell">
      <header className="lab-header">
        <div>
          <p className="eyebrow">ASSET LAB · 001 / 004 / 007</p>
          <h1>Primeiro provamos o pipeline. Depois desenhamos o produto.</h1>
        </div>
        <a className="text-link" href="/">
          ← início
        </a>
      </header>

      <section className="starter-grid" aria-label="Pokémon do laboratório">
        {starters.map((pokemon) => (
          <article className="starter-card" key={pokemon.id}>
            <div className="pokemon-placeholder" aria-hidden="true">
              <span>#{String(pokemon.id).padStart(3, '0')}</span>
            </div>
            <div>
              <p className="card-kicker">LAB TARGET</p>
              <h2>{pokemon.name}</h2>
              <p>{pokemon.type}</p>
            </div>
            <span className="status-pill">pipeline pendente</span>
          </article>
        ))}
      </section>

      <section className="pipeline-panel">
        <div>
          <p className="eyebrow">VISUAL ASSET SYSTEM</p>
          <h2>Cada fonte tem uma função e pode ser trocada sem reescrever a UI.</h2>
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
        Fase 2 substituirá os placeholders por assets reais e medirá carregamento, fallback, shiny,
        enquadramento, animações e comportamento em mobile.
      </p>
    </main>
  );
}
