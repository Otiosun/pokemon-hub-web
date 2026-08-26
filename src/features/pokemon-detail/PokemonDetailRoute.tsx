import { useEffect, useState } from 'react';
import { getPokemonAssetUrl } from '../../visual-assets/assetBaseUrl';
import { PokemonDetailPage } from './PokemonDetailPage';
import { getFieldDexSpecies, getFieldDexVisual } from './fieldDexSpecies';

type AssetPayload = {
  model: string;
  materials: Record<string, { texture: string }>;
};

async function consumeResponse(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, cache: 'force-cache' });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  await response.arrayBuffer();
}

async function preloadFieldDexSpecies(routeSlug: string, signal: AbortSignal) {
  const species = getFieldDexSpecies(routeSlug);
  const assetResponse = await fetch(getPokemonAssetUrl(species.slug, 'asset.json'), {
    signal,
    cache: 'no-cache',
  });
  if (!assetResponse.ok) throw new Error(`asset.json HTTP ${assetResponse.status}`);

  const contentType = assetResponse.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('json')) {
    throw new Error(`asset.json retornou ${contentType || 'conteúdo não JSON'}`);
  }

  const payload = (await assetResponse.json()) as AssetPayload;
  const textureNames = [...new Set(Object.values(payload.materials).map((binding) => binding.texture))];
  const urls = [
    getPokemonAssetUrl(species.slug, payload.model),
    ...textureNames.map((texture) => getPokemonAssetUrl(species.slug, texture)),
  ];

  await Promise.all(urls.map((url) => consumeResponse(url, signal)));

  // Prime the short 2D bridge as well. A broken remote artwork must never block a valid 3D record.
  const artwork = getFieldDexVisual(species.dex).artworkHome;
  try {
    await consumeResponse(artwork, signal);
  } catch (error) {
    if (signal.aborted) throw error;
  }
}

function replaceRouteWithoutReload(routeSlug: string) {
  const destination = `/pokemon/${routeSlug}`;
  window.history.replaceState({}, '', destination);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function PokemonDetailRoute({ routeSlug }: { routeSlug: string }) {
  const [committedRouteSlug, setCommittedRouteSlug] = useState(routeSlug);
  const requestedSpecies = getFieldDexSpecies(routeSlug);
  const committedSpecies = getFieldDexSpecies(committedRouteSlug);
  const pending = requestedSpecies.slug !== committedSpecies.slug;

  useEffect(() => {
    if (!pending) return;

    const controller = new AbortController();
    let current = true;

    void preloadFieldDexSpecies(routeSlug, controller.signal)
      .then(() => {
        if (!current || controller.signal.aborted) return;
        setCommittedRouteSlug(routeSlug);
      })
      .catch((error) => {
        if (!current || controller.signal.aborted) return;
        console.error(`Field Dex preload failed for ${requestedSpecies.slug}`, error);
        replaceRouteWithoutReload(committedSpecies.routeSlug);
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [committedSpecies.routeSlug, pending, requestedSpecies.slug, routeSlug]);

  return (
    <div className={`dex-route${pending ? ' is-pending' : ''}`} aria-busy={pending}>
      <PokemonDetailPage routeSlug={committedRouteSlug} />
    </div>
  );
}
