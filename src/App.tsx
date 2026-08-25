import { AssetLabPage } from './features/asset-lab/AssetLabPage';

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
        <a className="primary-link" href="/asset-lab">
          Abrir Asset Lab
        </a>
      </section>
    </main>
  );
}

export function App() {
  return window.location.pathname.startsWith('/asset-lab') ? <AssetLabPage /> : <HomePage />;
}
