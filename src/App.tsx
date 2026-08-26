import { lazy, Suspense, useEffect, useState } from 'react';
import { PokemonDetailRoute } from './features/pokemon-detail/PokemonDetailRoute';

const AssetLabPage = lazy(() =>
  import('./features/asset-lab/AssetLabPage').then((module) => ({ default: module.AssetLabPage })),
);
const GenerationsLabPage = lazy(() =>
  import('./features/asset-lab/GenerationsLabPage').then((module) => ({ default: module.GenerationsLabPage })),
);

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

function LabRouteFallback() {
  return (
    <main className="shell" aria-busy="true">
      <p className="eyebrow">CARREGANDO LABORATÓRIO…</p>
    </main>
  );
}

function getPath() {
  return window.location.pathname;
}

function getPokemonRouteSlug(path: string) {
  return path.split('/').filter(Boolean).at(-1) ?? 'demo-charmander';
}

function resetFieldDexViewport() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

export function App() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = getPath();
      setPath(nextPath);
      if (nextPath.startsWith('/pokemon/')) resetFieldDexViewport();
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      if (
        anchor.closest('.dex-route.is-pending .dex-nav') ||
        anchor.closest('.dex-route.is-pending .dex-review-rail')
      ) {
        event.preventDefault();
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const currentPath = window.location.pathname;
      const staysInsideFieldDex =
        currentPath.startsWith('/pokemon/') && destination.pathname.startsWith('/pokemon/');
      const sameDestination =
        destination.pathname === currentPath && destination.search === window.location.search;

      if (sameDestination) {
        if (staysInsideFieldDex) event.preventDefault();
        return;
      }

      event.preventDefault();
      window.history.pushState({}, '', `${destination.pathname}${destination.search}${destination.hash}`);
      setPath(destination.pathname);

      if (destination.pathname.startsWith('/pokemon/')) {
        resetFieldDexViewport();
      } else if (!staysInsideFieldDex) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  if (path.startsWith('/pokemon/')) {
    return <PokemonDetailRoute routeSlug={getPokemonRouteSlug(path)} />;
  }
  if (path.startsWith('/asset-lab/generations')) {
    return (
      <Suspense fallback={<LabRouteFallback />}>
        <GenerationsLabPage />
      </Suspense>
    );
  }
  if (path.startsWith('/asset-lab')) {
    return (
      <Suspense fallback={<LabRouteFallback />}>
        <AssetLabPage />
      </Suspense>
    );
  }
  return <HomePage />;
}
