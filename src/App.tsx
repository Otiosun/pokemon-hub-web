import { AssetLabPage } from './features/asset-lab/AssetLabPage';
import { GenerationsLabPage } from './features/asset-lab/GenerationsLabPage';
import { PokemonDetailPage } from './features/pokemon-detail/PokemonDetailPage';

function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">POKÉMON HUB · FASE 1</p>
        <h1>Uma casa visual para cada Pokémon do jogador.</h1>
        <p className="hero-copy">
          Time, Box e Pokédex serão construídos em torno de uma camada visual híbrida que continua
          funcionando mesmo quando o 3D não está disponível.
        </p>
        <div className="hero-actions">
          <a className="primary-link" href="/pokemon/demo-charmander">
            Abrir página do Pokémon
          </a>
          <a className="secondary-link" href="/asset-lab">
            Asset Lab
          </a>
        </div>
      </section>
    </main>
  );
}

export function App() {
  const path = window.location.pathname;
  if (path.startsWith('/pokemon/')) return <PokemonDetailPage />;
  if (path.startsWith('/asset-lab/generations')) return <GenerationsLabPage />;
  if (path.startsWith('/asset-lab')) return <AssetLabPage />;
  return <HomePage />;
}
