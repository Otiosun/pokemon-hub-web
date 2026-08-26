import { useEffect, useRef, useState } from 'react';
import type { StarterVisualManifest } from '../../visual-assets/starterManifest';

type ModelViewerNode = HTMLElement & {
  availableAnimations?: readonly string[];
};

type ViewerState = 'loading' | 'ready' | 'failed';

type Props = {
  pokemon: StarterVisualManifest;
  forceFallback: boolean;
};

export function PokemonModelViewer({ pokemon, forceFallback }: Props) {
  const viewerRef = useRef<ModelViewerNode | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>('loading');
  const [animations, setAnimations] = useState<readonly string[]>([]);
  const [artworkIndex, setArtworkIndex] = useState(0);

  const artworkFallbacks = [
    pokemon.artworkHome.url,
    pokemon.artworkOfficial.url,
    pokemon.animatedSprite.url,
  ] as const;

  useEffect(() => {
    let active = true;
    void import('@google/model-viewer')
      .then(() => {
        if (active) setViewerState('loading');
      })
      .catch(() => {
        if (active) setViewerState('failed');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setViewerState('loading');
    setAnimations([]);
    setArtworkIndex(0);
  }, [pokemon.id]);

  useEffect(() => {
    const node = viewerRef.current;
    if (!node) return;

    const handleLoad = () => {
      setViewerState('ready');
      setAnimations(node.availableAnimations ?? []);
    };
    const handleError = () => setViewerState('failed');

    node.addEventListener('load', handleLoad);
    node.addEventListener('error', handleError);
    return () => {
      node.removeEventListener('load', handleLoad);
      node.removeEventListener('error', handleError);
    };
  }, [pokemon.id]);

  const showFallback = forceFallback || viewerState === 'failed';
  const currentArtwork = artworkFallbacks[Math.min(artworkIndex, artworkFallbacks.length - 1)];

  if (showFallback) {
    return (
      <div className="viewer-fallback">
        <img
          src={currentArtwork}
          alt={`${pokemon.name} — fallback visual`}
          onError={() => setArtworkIndex((index) => Math.min(index + 1, artworkFallbacks.length - 1))}
        />
        <span>3D indisponível · fallback automático</span>
      </div>
    );
  }

  return (
    <div className="viewer-shell">
      <model-viewer
        ref={viewerRef}
        className="model-viewer"
        src={pokemon.model3d.url}
        poster={pokemon.artworkHome.url}
        alt={`Modelo 3D de ${pokemon.name}`}
        camera-controls
        touch-action="pan-y"
        interaction-prompt="auto"
        shadow-intensity="0.65"
        autoplay
      />
      <div className="viewer-status" aria-live="polite">
        <span className={`status-dot status-${viewerState}`} />
        {viewerState === 'ready' ? '3D carregado' : 'carregando 3D…'}
        {viewerState === 'ready' && (
          <small>{animations.length > 0 ? `${animations.length} animações detectadas` : 'sem clips detectados'}</small>
        )}
      </div>
    </div>
  );
}
