import { lazy, Suspense, type ReactNode, useEffect, useState } from 'react';
import { HubNavigation, type HubSection } from './components/HubNavigation';
import { rememberPokedexIndexScroll } from './features/pokedex/pokedexIndexSession';
import { PokemonDetailRoute } from './features/pokemon-detail/PokemonDetailRoute';

const PokedexIndexPage = lazy(() =>
  import('./features/pokedex/PokedexIndexPage').then((module) => ({ default: module.PokedexIndexPage })),
);
const PokedexSpeciesPage = lazy(() =>
  import('./features/pokedex/PokedexSpeciesPage').then((module) => ({ default: module.PokedexSpeciesPage })),
);
const AssetLabPage = lazy(() =>
  import('./features/asset-lab/AssetLabPage').then((module) => ({ default: module.AssetLabPage })),
);
const GenerationsLabPage = lazy(() =>
  import('./features/asset-lab/GenerationsLabPage').then((module) => ({ default: module.GenerationsLabPage })),
);

function HubFrame({ active, children }: { active: HubSection | null; children: ReactNode }) {
  return (
    <div className="hub-with-navigation">
      <HubNavigation active={active} />
      <div className="hub-navigation-content">{children}</div>
    </div>
  );
}

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

function SectionPlaceholder({ section, title, copy }: { section: HubSection; title: string; copy: string }) {
  return (
    <main className="shell hub-section-placeholder">
      <p className="eyebrow">POKÉMON HUB · {section.toUpperCase()}</p>
      <h1>{title}</h1>
      <p className="hero-copy">{copy}</p>
      <a className="secondary-link" href="/pokedex">Voltar à Pokédex</a>
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

function getPokedexDex(path: string) {
  const raw = path.split('/').filter(Boolean)[1] ?? '1';
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 386 ? parsed : 1;
}

function resetRecordViewport() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

function isRecordPath(path: string) {
  return path.startsWith('/pokemon/') || path.startsWith('/pokedex/');
}

function isPokedexIndexPath(path: string) {
  return path === '/pokedex' || path === '/pokedex/';
}

function usesSiblingHistoryReplacement(anchor: HTMLAnchorElement) {
  return Boolean(anchor.closest('.pokedex-species-side-nav, .dex-nav'));
}

export function App() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = getPath();
      setPath(nextPath);
      if (isRecordPath(nextPath)) resetRecordViewport();
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

      if (isPokedexIndexPath(currentPath)) {
        rememberPokedexIndexScroll(window.scrollY);
      }

      event.preventDefault();
      const nextLocation = `${destination.pathname}${destination.search}${destination.hash}`;
      if (usesSiblingHistoryReplacement(anchor)) {
        window.history.replaceState({}, '', nextLocation);
      } else {
        window.history.pushState({}, '', nextLocation);
      }
      setPath(destination.pathname);

      if (isRecordPath(destination.pathname)) {
        resetRecordViewport();
      } else if (!isPokedexIndexPath(destination.pathname)) {
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

  if (path === '/pokemon' || path === '/pokemon/') {
    return (
      <HubFrame active="pokemon">
        <SectionPlaceholder
          section="pokemon"
          title="Meus Pokémon"
          copy="A coleção do jogador será construída aqui. Box será um modo de organização desta mesma coleção, sem esconder Pokémon que estejam no Time."
        />
      </HubFrame>
    );
  }
  if (path === '/team' || path === '/team/') {
    return (
      <HubFrame active="team">
        <SectionPlaceholder
          section="team"
          title="Meu Time"
          copy="O workspace de seis slots entra nesta área, com troca rápida de membros e leitura de cobertura sem transformar a experiência em planilha."
        />
      </HubFrame>
    );
  }
  if (path.startsWith('/pokemon/')) {
    return <PokemonDetailRoute routeSlug={getPokemonRouteSlug(path)} />;
  }
  if (path.startsWith('/pokedex/')) {
    return (
      <HubFrame active="pokedex">
        <Suspense fallback={<RouteFallback label="ABRINDO REGISTRO NACIONAL…" />}>
          <PokedexSpeciesPage dex={getPokedexDex(path)} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokedex' || path === '/pokedex/') {
    return (
      <HubFrame active="pokedex">
        <Suspense fallback={<RouteFallback label="CARREGANDO ÍNDICE NACIONAL…" />}>
          <PokedexIndexPage />
        </Suspense>
      </HubFrame>
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
  return (
    <HubFrame active={null}>
      <HomePage />
    </HubFrame>
  );
}
