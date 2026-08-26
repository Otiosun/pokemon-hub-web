import { lazy, Suspense, useEffect, useState } from 'react';
import { PokemonDetailRoute } from './features/pokemon-detail/PokemonDetailRoute';

const PokedexIndexPage = lazy(() =>
  import('./features/pokedex/PokedexIndexPage').then((module) => ({ default: module.PokedexIndexPage })),
);
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
        <p className="eyebrow">POKÉMON HUB · FIELD DEX</p>
        <h1>Explore o Índice Nacional.</h1>
        <p className="hero-copy">
          Consulte o catálogo de espécies e abra os registros que já estão disponíveis para inspeção
          no Field Dex.
        </p>
        <div className="hero-actions">
          <a className="primary-link" href="/pokedex">
            Abrir Pokédex
          </a>
          <a className="secondary-link" href="/pokemon/demo-charmander">
            Abrir Field Dex
          </a>
        </div>
      </section>
    </main>
  );
}

function RouteFallback({ label }: { label: string }) {
  return (
    <main className="shell" aria-busy="true">
      <p className="eyebrow">{label}</p>
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

      if (anchor.closest('.dex-route.is-pending .dex-nav')) {
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
      } else {
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
  if (path.startsWith('/pokedex')) {
    return (
      <Suspense fallback={<RouteFallback label="CARREGANDO ÍNDICE NACIONAL…" />}>
        <PokedexIndexPage />
      </Suspense>
    );
  }
  if (path.startsWith('/asset-lab/generations')) {
    return (
      <Suspense fallback={<RouteFallback label="CARREGANDO LABORATÓRIO…" />}>
        <GenerationsLabPage />
      </Suspense>
    );
  }
  if (path.startsWith('/asset-lab')) {
    return (
      <Suspense fallback={<RouteFallback label="CARREGANDO LABORATÓRIO…" />}>
        <AssetLabPage />
      </Suspense>
    );
  }
  return <HomePage />;
}
