import { lazy, startTransition, Suspense, type ReactNode, type SyntheticEvent, useEffect, useState } from 'react';
import { HubNavigation } from './components/HubNavigation';
import { HubModuleHeader } from './components/HubModuleHeader';
import { rememberPokedexIndexScroll } from './features/pokedex/pokedexIndexSession';
import {
  hubSectionForPath,
  readHubDestinations,
  rememberHubDestination,
  shouldTraverseBackForUp,
  type HubDestinations,
  type HubSection,
} from './navigation/hubNavigationSession';
import { resolveProductRoute } from './navigation/productIntegrity';
import { preloadProductRoute } from './navigation/productRoutePreload';
import { usePlayerPortalAdminAccess } from './player-api/playerPortalAdminBrowserAccess';
import { usePlayerPortalBrowserSession } from './player-api/playerPortalBrowserSession';
import './hub-route-fallback-v3.css';

const JourneyPage = lazy(() =>
  import('./features/journey/JourneyPage').then((module) => ({ default: module.JourneyPage })),
);
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
const InventoryPage = lazy(() =>
  import('./features/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage })),
);
const AdminShellPage = lazy(() =>
  import('./features/admin/AdminShellPage').then((module) => ({ default: module.AdminShellPage })),
);

type ChampionStoreOffer = {
  code: string;
  title: string;
  price: string;
  category: string;
  paragraphs: readonly string[];
  artSrc: string;
  artAlt: string;
  bullets?: readonly string[];
  variants?: readonly { label: string; price: string; description: string }[];
  duration?: string;
};

const CHAMPION_STORE_OFFERS: readonly ChampionStoreOffer[] = [
  {
    code: 'TERA',
    title: 'Terastalização',
    price: '50,00 $',
    category: 'MECÂNICA',
    artSrc: '/champion-store/terastallization.jpg',
    artAlt: 'Arte de Terastalização do catálogo Pokémon Beyond',
    paragraphs: [
      'Transforme seu Pokémon em uma verdadeira jóia de batalha. Terastalização é uma transformação temporária na qual o Pokémon assume uma forma cristalizada e manifesta um Tera type. Esse tipo pode ser igual a um de seus tipos originais ou completamente diferente, permitindo criar estratégias que normalmente não seriam possíveis. Um Pokémon Água/Voador, por exemplo, pode possuir Tera Type Elétrico.',
    ],
  },
  {
    code: 'Z',
    title: 'Movimento Z',
    price: '40,00 $',
    category: 'MECÂNICA',
    artSrc: '/champion-store/z-move.jpg',
    artAlt: 'Arte de Movimento Z do catálogo Pokémon Beyond',
    paragraphs: [
      'Você poderá utilizar Z-Moves oficiais durante as batalhas elegíveis ou desenvolver um Z-Move original, criado especialmente para o seu Pokémon. Se trata de um golpe especial compartilhado entre o treinador e o Pokémon! Ao criar seu próprio Z-Move, você poderá desenvolver seu conceito, nome, aparência e funcionamento. A equipe analisará a proposta e definirá os parâmetros necessários para manter o movimento equilibrado dentro do sistema de batalhas. Também será possível utilizar Z-Moves já existentes no universo Pokémon, incluindo movimentos apresentados nos jogos e no anime.',
    ],
  },
  {
    code: 'GMAX',
    title: 'Gigantamax',
    price: '60,00',
    category: 'MECÂNICA',
    artSrc: '/champion-store/gigantamax.jpg',
    artAlt: 'Arte de Gigantamax do catálogo Pokémon Beyond',
    paragraphs: [
      'A Gamepass Gigantamax concede permanentemente ao seu personagem acesso à poderosa mecânica de Gigantamax em Pokémon Beyond.',
      'A partir da aquisição, você poderá utilizar o Gigantamax em um Pokémon, permitindo que ele assuma suas formas Gigantamax durante as batalhas e encontros. O acesso a mecânica permanece vinculado ao seu personagem durante toda a jornada, auxiliando em batalhas com um poder destrutivo absurdo.',
    ],
  },
  {
    code: 'LUCK',
    title: 'Benção da Sorte',
    price: 'R$ 60,00',
    category: 'JORNADA',
    artSrc: '/champion-store/blessing-luck.jpg',
    artAlt: 'Arte de Benção da Sorte do catálogo Pokémon Beyond',
    paragraphs: [
      'A sorte está ao seu lado permanentemente. A Gamepass Sorte em Dobro aumenta permanentemente em 2× as chances de capturar os Pokémon durante encontros selvagens em Pokémon Beyond. A partir da aquisição, o bônus fica vinculado ao seu personagem e será aplicado automaticamente em todos os encontros elegíveis realizados durante sua jornada. Em cada encontro selvagem, o sistema realiza o sorteio normalmente. Com a sorte em Dobro, as chances correspondentes às categorias de raridade são modificadas de acordo com o multiplicador de sorte definido pelo RPG.',
    ],
  },
  {
    code: 'SAVE+',
    title: 'Save Premium',
    price: 'R$ 45,00',
    category: 'JORNADA',
    artSrc: '/champion-store/save-premium.jpg',
    artAlt: 'Arte de Save Premium do catálogo Pokémon Beyond',
    paragraphs: [
      'O Save Premium permite preservar o progresso elegível da sua jornada para que você possa retornar a ele futuramente.',
      'Pokémon obtidos, itens adquiridos e outros conteúdos vinculados ao Save poderão permanecer associados ao seu progresso, permitindo que você retome sua história ou utilize determinados conteúdos em uma nova etapa da sua jornada.',
    ],
  },
  {
    code: 'GEN',
    title: 'Pokémon Gênesis',
    price: '60,00 $',
    category: 'CRIAÇÃO',
    artSrc: '/champion-store/pokemon-genesis.gif',
    artAlt: 'Arte animada de Pokémon Gênesis do catálogo Pokémon Beyond',
    paragraphs: [
      'Crie um Pokémon que nunca existiu.',
      'Já imaginou encontrar um Pokémon e saber que foi você quem criou aquela espécie? Com o Pokémon Gênesis, você recebe o direito de desenvolver uma espécie Pokémon completamente original para fazer parte de Pokémon Beyond.',
      'Você poderá definir:',
    ],
    bullets: [
      'Nome • Aparência • Tipos • Habilidades • Personalidade • Características • Conceito • Linha evolutiva',
      'É possível desenvolver uma linha evolutiva de até 3 estágios, criando desde a forma básica até sua evolução final.',
    ],
  },
  {
    code: 'GYM',
    title: 'Insígnia de Ginásio',
    price: 'R$ 100,00',
    category: 'FUNÇÃO',
    artSrc: '/champion-store/gym-badge.jpg',
    artAlt: 'Arte de Insígnia de Ginásio do catálogo Pokémon Beyond',
    paragraphs: [
      'A Insígnia de Ginásio concede ao seu portador o direito de assumir o cargo de Líder de Ginásio em Pokémon Beyond. O portador poderá escolher, junto a equipe de cinco Pokémons, o tipo do Ginásio, desenvolver sua identidade e participar da construção de seus desafios, tornando-se responsável por uma das principais instituições da região. O cargo estará sujeito à aprovação da equipe e às regras administrativas do RPG.',
    ],
  },
  {
    code: 'RED',
    title: 'Save Red',
    price: 'R$ 60,00',
    category: 'SAVE',
    artSrc: '/champion-store/save-red.jpg',
    artAlt: 'Arte de Save Red do catálogo Pokémon Beyond',
    paragraphs: [
      'Red é um dos maiores nomes da história Pokémon, agora, parte de seu legado pode acompanhar você desde o começo da sua própria jornada.',
      'O Save Red é um pacote especial contendo conteúdos inspirados na trajetória de Red, reunindo Pokémon e itens selecionados para jogadores que querem começar sua aventura carregando um legado diferente.',
      'Contém:',
    ],
    bullets: [
      'Pokémons da jornada de Red em nível inicial para desbloquear.',
      'Conteúdos exclusivos do Save',
      'Recursos destinados ao início da jornada',
    ],
  },
  {
    code: 'EGG',
    title: 'Ovo Pokémon',
    price: 'A partir de R$ 20',
    category: 'POKÉMON',
    artSrc: '/champion-store/pokemon-egg.jpg',
    artAlt: 'Arte de Ovo Pokémon do catálogo Pokémon Beyond',
    paragraphs: [
      'Receba um Ovo Pokémon misterioso e descubra qual Pokémon está esperando para nascer. Após receber o ovo, será necessário cuidar dele e percorrer a distância necessária para que aconteça a eclosão. O Pokémon que nascer poderá ser definido ou aleatório, de acordo com a categoria do ovo adquirido. Cada ovo possui possibilidades e raridades próprias, tornando cada eclosão uma nova descoberta.',
    ],
    variants: [
      {
        label: 'Ovo Comum',
        price: 'R$ 20',
        description:
          'Pokémon encontrados com maior frequência, ideal para quem quer adicionar uma nova descoberta a sua equipe sem gastar muito.',
      },
      {
        label: 'Ovo Raro',
        price: 'R$ 30',
        description:
          'Possibilidades mais incomuns e Pokémon de maior raridade, uma opção para quem quer correr um risco maior em busca de uma recompensa melhor.',
      },
      {
        label: 'Ovo Especial',
        price: 'R$ 45',
        description:
          'A categoria mais exclusiva disponível. Possui acesso a possibilidades que não aparecem nos ovos comuns e raros, tornando cada eclosão muito mais valiosa.',
      },
    ],
  },
  {
    code: '2XP',
    title: 'XP em Dobro',
    price: 'R$ 40,00',
    category: 'PROGRESSÃO',
    artSrc: '/champion-store/double-xp.jpg',
    artAlt: 'Arte de XP em Dobro do catálogo Pokémon Beyond',
    duration: '7 DIAS',
    paragraphs: [
      'Receba 2× a experiência obtida durante sua jornada em Pokémon Beyond, acelerando o desenvolvimento do seu personagem e permitindo alcançar novos níveis com mais rapidez. O item tem a duração de 7 dias.',
      'O bônus será aplicado à experiência recebida pelas atividades elegíveis durante o período de duração da Gamepass.',
    ],
  },
];

function hideMissingStoreArt(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true;
}

function ChampionStorePage() {
  return (
    <main className="champion-store-page">
      <HubModuleHeader module="store" metaLabel="GAMEPASSES" metaValue="10" />

      <section className="champion-store-intro">
        <header className="champion-store-title-block">
          <div className="champion-store-kicker">CHAMPION STORE</div>
          <h1>GAMEPASS — POKÉMON BEYOND</h1>
        </header>

        <img
          className="champion-store-intro-art"
          src="/champion-store/intro-community.jpg"
          alt="Arte de abertura do catálogo Pokémon Beyond"
          onError={hideMissingStoreArt}
        />

        <div className="champion-store-intro-copy">
          <p>
            As Gamepasses são pacotes especiais disponibilizados em Pokémon Beyond que concedem
            ao jogador acesso a conteúdos, recursos e benefícios exclusivos dentro do RPG.
          </p>
          <p>
            Cada Gamepass possui uma proposta própria e pode incluir Pokémon exclusivos, itens
            especiais, espaços adicionais, acessos, recursos de exploração, cosméticos,
            recompensas e outras funcionalidades que não estão disponíveis normalmente para
            jogadores sem a respectiva Gamepass.
          </p>
        </div>

        <img
          className="champion-store-intro-art"
          src="/champion-store/intro-world.jpg"
          alt="Arte do catálogo Pokémon Beyond"
          onError={hideMissingStoreArt}
        />

        <h2 className="champion-store-how-title">COMO FUNCIONAM?</h2>

        <img
          className="champion-store-intro-art"
          src="/champion-store/intro-journey.jpg"
          alt="Arte da explicação das Gamepasses"
          onError={hideMissingStoreArt}
        />

        <div className="champion-store-intro-copy is-how">
          <p>
            Ao adquirir uma Gamepass, o jogador recebe todos os benefícios descritos na página
            correspondente. Alguns conteúdos podem ser entregues imediatamente após a confirmação
            da compra, enquanto outros podem representar acessos permanentes a sistemas ou áreas
            específicas do RPG. Após a compra, os itens geralmente são entregues em até 64 horas
            após o pagamento.
          </p>
        </div>
      </section>

      <section className="champion-store-grid" aria-label="Gamepasses disponíveis">
        {CHAMPION_STORE_OFFERS.map((offer) => (
          <article className="champion-store-card" key={offer.code}>
            <header className="champion-store-card-header">
              <span className="champion-store-code" aria-hidden="true">{offer.code}</span>
              <div>
                <small>{offer.category}</small>
                <h2>{offer.title}</h2>
              </div>
            </header>

            <img
              className="champion-store-card-art"
              src={offer.artSrc}
              alt={offer.artAlt}
              onError={hideMissingStoreArt}
            />

            <div className="champion-store-card-body">
              <div className="champion-store-copy">
                {offer.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>

              {offer.bullets ? (
                <ul>
                  {offer.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              ) : null}

              {offer.variants ? (
                <div className="champion-store-variants">
                  {offer.variants.map((variant) => (
                    <div key={variant.label}>
                      <span>{variant.label}</span>
                      <strong>{variant.price}</strong>
                      <small>{variant.description}</small>
                    </div>
                  ))}
                </div>
              ) : null}

              {offer.duration ? <span className="champion-store-duration">{offer.duration}</span> : null}

              <footer className="champion-store-price">
                <span>PREÇO</span>
                <strong>{offer.price}</strong>
              </footer>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

const SECTION_ROOTS: Record<HubSection, string> = {
  journey: '/jornada',
  pokedex: '/pokedex',
  box: '/pokemon',
  store: '/champion-store',
};

type HubHistoryState = {
  hubSection?: HubSection;
  hubParent?: string;
  hubParentInHistory?: boolean;
};

type FallbackModule = 'journey' | 'pokedex' | 'box';

const FALLBACK_LABELS: Record<FallbackModule, string> = {
  journey: 'JORNADA',
  pokedex: 'POKÉDEX',
  box: 'BOX',
};

function HubFrame({
  active,
  destinations,
  children,
  showAdmin = false,
  adminActive = false,
}: {
  active: HubSection | null;
  destinations: HubDestinations;
  children: ReactNode;
  showAdmin?: boolean;
  adminActive?: boolean;
}) {
  return (
    <HubNavigation
      active={active}
      destinations={destinations}
      showAdmin={showAdmin}
      adminActive={adminActive}
    >
      {children}
    </HubNavigation>
  );
}

function RouteFallback({ label, module }: { label: string; module: FallbackModule }) {
  return (
    <section
      className="hub-route-fallback"
      data-hub-fallback={module}
      aria-busy="true"
      aria-label={label}
    >
      <div className="hub-route-fallback-head">
        <span className="hub-route-fallback-lens" aria-hidden="true" />
        <span>
          <strong>{FALLBACK_LABELS[module]}</strong>
          <small>{label}</small>
        </span>
      </div>
      <div className="hub-route-fallback-body" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function ProductNotFound({
  destinations,
  showAdmin = false,
}: {
  destinations: HubDestinations;
  showAdmin?: boolean;
}) {
  return (
    <HubFrame active={null} destinations={destinations} showAdmin={showAdmin}>
      <section className="hub-route-fallback hub-product-not-found" data-hub-fallback="journey">
        <div className="hub-route-fallback-head">
          <span className="hub-route-fallback-lens" aria-hidden="true" />
          <span>
            <strong>POKÉMON HUB</strong>
            <small>ENDEREÇO INDISPONÍVEL</small>
          </span>
        </div>
        <div className="hub-product-not-found-body">
          <p>Este endereço não faz parte da versão atual do Hub.</p>
          <a href="/jornada">VOLTAR À JORNADA</a>
        </div>
      </section>
    </HubFrame>
  );
}

function getPath() {
  const rawPath = window.location.pathname === '/' ? '/jornada' : window.location.pathname;
  const resolution = resolveProductRoute(rawPath);
  if (resolution.kind === 'redirect') {
    const nextLocation = `${resolution.to}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextLocation);
    return resolution.to;
  }
  return rawPath;
}

function getHubLocation() {
  return `${window.location.pathname}${window.location.search}`;
}

function getPokemonRouteSlug(path: string) {
  return path.split('/').filter(Boolean).at(-1) ?? '';
}

function isOwnedPokemonInstancePath(path: string) {
  return path.startsWith('/pokemon/') && resolveProductRoute(path).kind === 'route';
}

function getPokedexDex(path: string) {
  const raw = path.split('/').filter(Boolean)[1] ?? '1';
  return Number.parseInt(raw, 10);
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

function explicitParentForNavigation(anchor: HTMLAnchorElement) {
  const raw = anchor.dataset.hubParent;
  if (!raw?.startsWith('/')) return undefined;
  const parent = new URL(raw, window.location.origin);
  if (parent.origin !== window.location.origin) return undefined;
  return `${parent.pathname}${parent.search}${parent.hash}`;
}

function rootForPath(path: string) {
  const section = hubSectionForPath(path);
  return section ? SECTION_ROOTS[section] : null;
}

function parentForNavigation(currentPath: string, currentSearch: string, destinationPath: string) {
  const currentSection = hubSectionForPath(currentPath);
  const destinationSection = hubSectionForPath(destinationPath);
  const currentRoot = rootForPath(currentPath);
  const normalizedCurrent = currentPath.replace(/\/$/, '');

  if (
    isOwnedPokemonInstancePath(destinationPath) &&
    currentSection === 'box' &&
    (normalizedCurrent === '/pokemon' || normalizedCurrent === '/team')
  ) {
    return `${normalizedCurrent}${currentSearch}`;
  }

  if (!destinationSection || currentSection !== destinationSection) return undefined;
  const destinationRoot = SECTION_ROOTS[destinationSection];
  if (destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`) return undefined;
  if (currentRoot === normalizedCurrent) {
    return `${normalizedCurrent}${currentSearch}`;
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

function warmAnchorTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;

  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return;

  const pending = preloadProductRoute(destination.pathname);
  if (pending) void pending.catch(() => undefined);
}

export function App() {
  const [path, setPath] = useState(getPath);
  const [hubDestinations, setHubDestinations] = useState(readHubDestinations);
  const playerPortalSession = usePlayerPortalBrowserSession();
  const adminAccess = usePlayerPortalAdminAccess(playerPortalSession.status === 'authenticated');
  const showAdmin = adminAccess.status === 'authorized';

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({ hubSection: 'journey' } satisfies HubHistoryState, '', '/jornada');
    }

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
    if (isRecordPath(path)) {
      resetRecordViewport();
    } else if (!isPokedexIndexPath(path)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [path]);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = getPath();
      const remembered = rememberHubDestination(getHubLocation());
      startTransition(() => {
        setPath(nextPath);
        setHubDestinations(remembered);
      });
    };

    const onDocumentPreloadIntent = (event: Event) => {
      warmAnchorTarget(event.target);
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

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const resolution = resolveProductRoute(destination.pathname);
      if (resolution.kind === 'redirect') {
        destination.pathname = resolution.to;
      }

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
        if (
          shouldTraverseBackForUp(
            historyState.hubParent,
            historyState.hubParentInHistory,
            nextLocation,
          )
        ) {
          window.history.back();
          return;
        }
        const destinationSection = hubSectionForPath(destination.pathname);
        const nextState: HubHistoryState = destinationSection ? { hubSection: destinationSection } : {};
        window.history.replaceState(nextState, '', nextLocation);
      } else if (isPrimaryNavigation) {
        window.history.replaceState(stateForPrimaryDestination(destination.pathname), '', nextLocation);
      } else if (usesSiblingHistoryReplacement(anchor)) {
        window.history.replaceState(historyState, '', nextLocation);
      } else {
        const destinationSection = hubSectionForPath(destination.pathname);
        const parent =
          explicitParentForNavigation(anchor) ??
          parentForNavigation(currentPath, window.location.search, destination.pathname);
        const nextState: HubHistoryState = {
          ...(destinationSection ? { hubSection: destinationSection } : {}),
          ...(parent ? { hubParent: parent, hubParentInHistory: true } : {}),
        };
        window.history.pushState(nextState, '', nextLocation);
      }

      const remembered = rememberHubDestination(`${destination.pathname}${destination.search}`);
      startTransition(() => {
        setPath(destination.pathname);
        setHubDestinations(remembered);
      });
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('pointerover', onDocumentPreloadIntent);
    document.addEventListener('pointerdown', onDocumentPreloadIntent);
    document.addEventListener('focusin', onDocumentPreloadIntent);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('pointerover', onDocumentPreloadIntent);
      document.removeEventListener('pointerdown', onDocumentPreloadIntent);
      document.removeEventListener('focusin', onDocumentPreloadIntent);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  if (path === '/admin' || path === '/admin/') {
    if (adminAccess.status !== 'authorized') {
      return <ProductNotFound destinations={hubDestinations} showAdmin={showAdmin} />;
    }

    return (
      <HubFrame
        active={null}
        destinations={hubDestinations}
        showAdmin
        adminActive
      >
        <Suspense fallback={<RouteFallback module="journey" label="ABRINDO CENTRAL ADM" />}>
          <AdminShellPage admin={adminAccess.admin} />
        </Suspense>
      </HubFrame>
    );
  }

  if (path === '/champion-store' || path === '/champion-store/') {
    return (
      <HubFrame active="store" destinations={hubDestinations} showAdmin={showAdmin}>
        <ChampionStorePage />
      </HubFrame>
    );
  }

  if (path === '/jornada/inventario' || path === '/jornada/inventario/') {
    return (
      <HubFrame active="journey" destinations={hubDestinations} showAdmin={showAdmin}>
        <Suspense fallback={<RouteFallback module="journey" label="ABRINDO INVENTÁRIO" />}>
          <InventoryPage />
        </Suspense>
      </HubFrame>
    );
  }

  if (path === '/jornada' || path === '/jornada/') {
    return (
      <HubFrame active="journey" destinations={hubDestinations} showAdmin={showAdmin}>
        <Suspense fallback={<RouteFallback module="journey" label="RETOMANDO JORNADA" />}>
          <JourneyPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokemon' || path === '/pokemon/') {
    return (
      <HubFrame active="box" destinations={hubDestinations} showAdmin={showAdmin}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO BOX" />}>
          <OwnedPokemonCollectionPage />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/team' || path === '/team/') {
    return (
      <HubFrame active="box" destinations={hubDestinations} showAdmin={showAdmin}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO TIME" />}>
          <TeamPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (isOwnedPokemonInstancePath(path)) {
    const historyState = (window.history.state ?? {}) as HubHistoryState;
    const instanceId = getPokemonRouteSlug(path);
    return (
      <HubFrame active="box" destinations={hubDestinations} showAdmin={showAdmin}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO POKÉMON" />}>
          <OwnedPokemonDetailPage
            key={instanceId}
            instanceId={instanceId}
            returnHref={historyState.hubParent ?? '/pokemon'}
          />
        </Suspense>
      </HubFrame>
    );
  }
  if (path.startsWith('/pokedex/') && resolveProductRoute(path).kind === 'route') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations} showAdmin={showAdmin}>
        <Suspense fallback={<RouteFallback module="pokedex" label="ABRINDO REGISTRO" />}>
          <PokedexSpeciesPage dex={getPokedexDex(path)} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokedex' || path === '/pokedex/') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations} showAdmin={showAdmin}>
        <Suspense fallback={<RouteFallback module="pokedex" label="PREPARANDO ÍNDICE" />}>
          <PokedexIndexPage />
        </Suspense>
      </HubFrame>
    );
  }

  return <ProductNotFound destinations={hubDestinations} />;
}
