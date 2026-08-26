import { lazy, Suspense, type ReactNode, useEffect, useState } from 'react';
import { HubNavigation } from './components/HubNavigation';
import { rememberPokedexIndexScroll } from './features/pokedex/pokedexIndexSession';
import { PokemonDetailRoute } from './features/pokemon-detail/PokemonDetailRoute';
import {
  hubSectionForPath,
  readHubDestinations,
  rememberHubDestination,
  type HubDestinations,
  type HubSection,
} from './navigation/hubNavigationSession';

const PokedexIndexPage = lazy(() =>
  import('./features/pokedex/PokedexIndexPage').then((module) => ({ default: module.PokedexIndexPage })),
);
const PokedexSpeciesPage = lazy(() =>
  import('./features/pokedex/PokedexSpeciesPage').then((module) => ({ default: module.PokedexSpeciesPage })),
);
const OwnedPokemonCollectionPage = lazy(() =>
  import('./features/collection/OwnedPokemonCollectionPage').then((module) => ({ default: module.OwnedPokemonCollectionPage })),
);
const OwnedPokemonDetailPage = lazy(() =>
  import('./features/collection/OwnedPokemonDetailPage').then((module) => ({ default: module.OwnedPokemonDetailPage })),
);
const TeamPage = lazy(() =>
  import('./features/team/TeamPage').then((module) => ({ default: module.TeamPage })),
);
const AssetLabPage = lazy(() =>
  import('./features/asset-lab/AssetLabPage').then((module) => ({ default: module.AssetLabPage })),
);
const GenerationsLabPage = lazy(() =>
  import('./features/asset-lab/GenerationsLabPage').then((module) => ({ default: module.GenerationsLabPage })),
);

const SECTION_ROOTS: Record<HubSection, string> = {
  pokedex: '/pokedex',
  pokemon: '/pokemon',
  team: '/team',
};

type HubHistoryState = {
  hubSection?: HubSection;
  hubParent?: string;
};

function HubFrame({
  active,
  destinations,
  children,
}: {
  active: HubSection | null;
  destinations: HubDestinations;
  children: ReactNode;
}) {
  return (
    <div className="hub-with-navigation">
      <HubNavigation active={active} destinations={destinations} />
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

function getHubLocation() {
  return `${window.location.pathname}${window.location.search}`;
}

function getPokemonRouteSlug(path: string) {
  return path.split('/').filter(Boolean).at(-1) ?? 'demo-charmander';
}

function isLegacyFieldDexPath(path: string) {
  return path.startsWith('/pokemon/demo-');
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
  return Boolean(anchor.closest('.pokedex-species-side-nav, .dex-nav, .owned-pokemon-side-nav'));
}

function rootForPath(path: string) {
  const section = hubSectionForPath(path);
  return section ? SECTION_ROOTS[section] : null;
}

function parentForNavigation(currentPath: string, destinationPath: string) {
  const currentSection = hubSectionForPath(currentPath);
  const destinationSection = hubSectionForPath(destinationPath);
  if (!destinationSection || currentSection !== destinationSection) return undefined;
  const destinationRoot = SECTION_ROOTS[destinationSection];
  if (destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`) return undefined;
  if (rootForPath(currentPath) === currentPath.replace(/\/$/, '')) {
    return currentPath.replace(/\/$/, '');
  }
  return undefined;
}

function stateForPrimaryDestination(destinationPath: string): HubHistoryState {
  const destinationSection = hubSectionForPath(destinationPath);
  if (!destinationSection) return {};
  const destinationRoot = SECTION_ROOTS[destinationSection];
  const isRoot = destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`;
  return {
    hubSection: destinationSection,
    ...(!isRoot ? { hubParent: destinationRoot } : {}),
  };
}

export function App() {
  const [path, setPath] = useState(getPath);
  const [hubDestinations, setHubDestinations] = useState(readHubDestinations);

  useEffect(() => {
    const initialSection = hubSectionForPath(window.location.pathname);
    const existing = (window.history.state ?? {}) as HubHistoryState;
    if (initialSection && !existing.hubSection) {
      const root = SECTION_ROOTS[initialSection];
      const currentPath = window.location.pathname;
      const isRoot = currentPath === root || currentPath === `${root}/`;
      window.history.replaceState(
        {
          ...existing,
          hubSection: initialSection,
          ...(!isRoot ? { hubParent: root } : {}),
        },
        '',
        window.location.href,
      );
    }
    setHubDestinations(rememberHubDestination(getHubLocation()));
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = getPath();
      setPath(nextPath);
      setHubDestinations(rememberHubDestination(getHubLocation()));
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
      const sameDocumentHash =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        Boolean(destination.hash) &&
        destination.hash !== window.location.hash;
      if (sameDocumentHash) return;

      const sameDestination =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash;

      if (sameDestination) {
        event.preventDefault();
        return;
      }

      if (isPokedexIndexPath(currentPath)) {
        rememberPokedexIndexScroll(window.scrollY);
      }

      event.preventDefault();
      const nextLocation = `${destination.pathname}${destination.search}${destination.hash}`;
      const historyState = (window.history.state ?? {}) as HubHistoryState;
      const isPrimaryNavigation = Boolean(anchor.dataset.hubPrimary);

      if (anchor.dataset.navMode === 'up') {
        const destinationSection = hubSectionForPath(destination.pathname);
        const nextState: HubHistoryState = destinationSection ? { hubSection: destinationSection } : {};
        window.history.replaceState(nextState, '', nextLocation);
      } else if (isPrimaryNavigation) {
        window.history.replaceState(stateForPrimaryDestination(destination.pathname), '', nextLocation);
      } else if (usesSiblingHistoryReplacement(anchor)) {
        window.history.replaceState(historyState, '', nextLocation);
      } else {
        const destinationSection = hubSectionForPath(destination.pathname);
        const parent = parentForNavigation(currentPath, destination.pathname);
        const nextState: HubHistoryState = {
          ...(destinationSection ? { hubSection: destinationSection } : {}),
          ...(parent ? { hubParent: parent } : {}),
        };
        window.history.pushState(nextState, '', nextLocation);
      }

      setPath(destination.pathname);
      setHubDestinations(rememberHubDestination(`${destination.pathname}${destination.search}`));

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
      <HubFrame active="pokemon" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback label="ABRINDO COLEÇÃO…" />}>
          <OwnedPokemonCollectionPage />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/team' || path === '/team/') {
    return (
      <HubFrame active="team" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback label="ABRINDO TIME…" />}>
          <TeamPage />
        </Suspense>
      </HubFrame>
    );
  }
  if (isLegacyFieldDexPath(path)) {
    return <PokemonDetailRoute routeSlug={getPokemonRouteSlug(path)} />;
  }
  if (path.startsWith('/pokemon/')) {
    return (
      <HubFrame active="pokemon" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback label="ABRINDO POKÉMON…" />}>
          <OwnedPokemonDetailPage instanceId={getPokemonRouteSlug(path)} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path.startsWith('/pokedex/')) {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback label="ABRINDO REGISTRO NACIONAL…" />}>
          <PokedexSpeciesPage dex={getPokedexDex(path)} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokedex' || path === '/pokedex/') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
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
    <HubFrame active={null} destinations={hubDestinations}>
      <HomePage />
    </HubFrame>
  );
}
