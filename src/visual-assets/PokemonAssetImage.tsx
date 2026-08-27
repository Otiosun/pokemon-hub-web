import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
} from 'react';
import { getPokemonSpeciesVisualAssets } from './pokemonVisualRegistry';
import './pokemon-asset-image.css';

export type PokemonImageRole = 'official-artwork' | 'home-artwork' | 'icon' | 'portrait';

type PokemonAssetImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError' | 'role'> & {
  dex: number;
  assetRole: PokemonImageRole;
  fallbackLabel?: string;
  onResolved?: (sourceRole: PokemonImageRole | 'placeholder') => void;
};

export type PokemonAlphaBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  sourceWidth: number;
  sourceHeight: number;
};

type PokemonAlphaTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

type SourceSelection = {
  key: string;
  index: number;
};

type AlphaRenderState = {
  src: string;
  bounds: PokemonAlphaBounds | null;
  transform: PokemonAlphaTransform | null;
};

const ALPHA_SCAN_EDGE = 144;
const ALPHA_THRESHOLD = 12;
const ALPHA_PADDING_RATIO = 0.035;
const ALPHA_FILL_RATIO = 0.94;
const alphaBoundsCache = new Map<string, Promise<PokemonAlphaBounds | null>>();

function sourceOrder(dex: number, assetRole: PokemonImageRole) {
  const visual = getPokemonSpeciesVisualAssets(dex);
  const sources: Record<PokemonImageRole, Array<{ role: PokemonImageRole; src: string }>> = {
    'official-artwork': [
      { role: 'official-artwork', src: visual.artworkOfficial },
      { role: 'home-artwork', src: visual.artworkHome },
      { role: 'icon', src: visual.icon },
    ],
    'home-artwork': [
      { role: 'home-artwork', src: visual.artworkHome },
      { role: 'official-artwork', src: visual.artworkOfficial },
      { role: 'icon', src: visual.icon },
    ],
    icon: [
      { role: 'icon', src: visual.icon },
      { role: 'home-artwork', src: visual.artworkHome },
      { role: 'official-artwork', src: visual.artworkOfficial },
    ],
    portrait: [
      { role: 'portrait', src: visual.portrait },
      { role: 'home-artwork', src: visual.artworkHome },
      { role: 'official-artwork', src: visual.artworkOfficial },
      { role: 'icon', src: visual.icon },
    ],
  };
  return sources[assetRole];
}

function shouldNormalizeAlpha(assetRole: PokemonImageRole) {
  return assetRole === 'official-artwork' || assetRole === 'home-artwork';
}

function readTransformScale(transform: string) {
  if (!transform || transform === 'none') return 1;
  const match = transform.match(/^matrix\(([^)]+)\)$/);
  if (!match) return 1;
  const values = match[1].split(',').map(Number);
  if (values.length < 2 || values.some((value) => !Number.isFinite(value))) return 1;
  return Math.hypot(values[0], values[1]) || 1;
}

export function calculatePokemonAlphaTransform({
  bounds,
  boxWidth,
  boxHeight,
  baseScale = 1,
}: {
  bounds: PokemonAlphaBounds;
  boxWidth: number;
  boxHeight: number;
  baseScale?: number;
}): PokemonAlphaTransform | null {
  if (boxWidth <= 0 || boxHeight <= 0 || bounds.sourceWidth <= 0 || bounds.sourceHeight <= 0) {
    return null;
  }

  const boundedWidth = Math.max(0.001, bounds.right - bounds.left);
  const boundedHeight = Math.max(0.001, bounds.bottom - bounds.top);
  const sourceFitScale = Math.min(boxWidth / bounds.sourceWidth, boxHeight / bounds.sourceHeight);

  const renderedSourceWidth = bounds.sourceWidth * sourceFitScale;
  const renderedSourceHeight = bounds.sourceHeight * sourceFitScale;
  const sourceOffsetX = (boxWidth - renderedSourceWidth) / 2;
  const sourceOffsetY = (boxHeight - renderedSourceHeight) / 2;
  const boundsCenterX = ((bounds.left + bounds.right) / 2) * bounds.sourceWidth;
  const boundsCenterY = ((bounds.top + bounds.bottom) / 2) * bounds.sourceHeight;
  const visibleWidth = boundedWidth * bounds.sourceWidth * sourceFitScale;
  const visibleHeight = boundedHeight * bounds.sourceHeight * sourceFitScale;

  const desiredScale = Math.min(boxWidth / visibleWidth, boxHeight / visibleHeight) * ALPHA_FILL_RATIO;
  const scale = Math.max(baseScale, desiredScale);

  const centerDeltaX = sourceOffsetX + boundsCenterX * sourceFitScale - boxWidth / 2;
  const centerDeltaY = sourceOffsetY + boundsCenterY * sourceFitScale - boxHeight / 2;

  return {
    scale,
    translateX: -centerDeltaX * scale,
    translateY: -centerDeltaY * scale,
  };
}

async function scanAlphaBounds(src: string): Promise<PokemonAlphaBounds | null> {
  if (typeof document === 'undefined' || typeof fetch === 'undefined') return null;

  const response = await fetch(src, { cache: 'force-cache', mode: 'cors' });
  if (!response.ok) throw new Error(`Artwork alpha scan HTTP ${response.status}`);

  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    bitmap.close();
    return null;
  }

  const scanScale = Math.min(1, ALPHA_SCAN_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scanScale));
  const height = Math.max(1, Math.round(sourceHeight * scanScale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return null;
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  const paddingX = Math.max(1, Math.ceil(contentWidth * ALPHA_PADDING_RATIO));
  const paddingY = Math.max(1, Math.ceil(contentHeight * ALPHA_PADDING_RATIO));
  const left = Math.max(0, minX - paddingX) / width;
  const top = Math.max(0, minY - paddingY) / height;
  const right = Math.min(width, maxX + 1 + paddingX) / width;
  const bottom = Math.min(height, maxY + 1 + paddingY) / height;

  return { left, top, right, bottom, sourceWidth, sourceHeight };
}

function getAlphaBounds(src: string) {
  const cached = alphaBoundsCache.get(src);
  if (cached) return cached;

  const pending = scanAlphaBounds(src).catch((error) => {
    console.warn('Pokemon artwork alpha normalization unavailable', error);
    return null;
  });
  alphaBoundsCache.set(src, pending);
  return pending;
}

function transformsMatch(
  left: PokemonAlphaTransform | null,
  right: PokemonAlphaTransform | null,
) {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    Math.abs(left.scale - right.scale) < 0.0001 &&
    Math.abs(left.translateX - right.translateX) < 0.05 &&
    Math.abs(left.translateY - right.translateY) < 0.05
  );
}

export function PokemonAssetImage({
  dex,
  assetRole,
  fallbackLabel = '?',
  className = '',
  onResolved,
  alt,
  style,
  ...imageProps
}: PokemonAssetImageProps) {
  const sources = useMemo(() => sourceOrder(dex, assetRole), [assetRole, dex]);
  const sourceKey = `${dex}:${assetRole}`;
  const [selection, setSelection] = useState<SourceSelection>({ key: sourceKey, index: 0 });
  const sourceIndex = selection.key === sourceKey ? selection.index : 0;
  const source = sources[sourceIndex];
  const [alphaState, setAlphaState] = useState<AlphaRenderState | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const baseScaleRef = useRef<{ src: string; scale: number } | null>(null);
  const activeBounds = alphaState?.src === source?.src ? alphaState.bounds : null;
  const alphaTransform = alphaState?.src === source?.src ? alphaState.transform : null;

  useEffect(() => {
    const image = imageRef.current;
    const sourceSrc = source?.src;
    if (!image || !sourceSrc || !activeBounds || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (imageRef.current?.getAttribute('src') !== sourceSrc) return;
      const baseScale = baseScaleRef.current?.src === sourceSrc ? baseScaleRef.current.scale : 1;
      const nextTransform = calculatePokemonAlphaTransform({
        bounds: activeBounds,
        boxWidth: image.clientWidth,
        boxHeight: image.clientHeight,
        baseScale,
      });
      setAlphaState((current) => {
        if (!current || current.src !== sourceSrc || !current.bounds) return current;
        if (transformsMatch(current.transform, nextTransform)) return current;
        return { ...current, transform: nextTransform };
      });
    });

    observer.observe(image);
    if (image.parentElement) observer.observe(image.parentElement);
    return () => observer.disconnect();
  }, [activeBounds, source?.src]);

  if (!source) {
    const placeholderClassName = `pokemon-asset-placeholder ${className}`.trim();
    if (alt) {
      return (
        <span className={placeholderClassName} role="img" aria-label={alt}>
          {fallbackLabel}
        </span>
      );
    }
    return (
      <span className={placeholderClassName} aria-hidden="true">
        {fallbackLabel}
      </span>
    );
  }

  const normalizedStyle = alphaTransform
    ? ({
        ...style,
        transform: `translate(${alphaTransform.translateX.toFixed(2)}px, ${alphaTransform.translateY.toFixed(2)}px) scale(${alphaTransform.scale.toFixed(4)})`,
        transformOrigin: 'center center',
      } satisfies CSSProperties)
    : style;

  return (
    <img
      {...imageProps}
      ref={imageRef}
      className={className}
      src={source.src}
      alt={alt}
      style={normalizedStyle}
      data-asset-role={source.role}
      data-alpha-normalized={alphaTransform ? 'true' : undefined}
      onLoad={(event) => {
        onResolved?.(source.role);
        if (!shouldNormalizeAlpha(source.role)) return;

        const loadedSource = source.src;
        const baseScale = readTransformScale(getComputedStyle(event.currentTarget).transform);
        baseScaleRef.current = { src: loadedSource, scale: baseScale };
        void getAlphaBounds(loadedSource).then((bounds) => {
          const image = imageRef.current;
          if (!image || image.getAttribute('src') !== loadedSource) return;
          const transform = bounds
            ? calculatePokemonAlphaTransform({
                bounds,
                boxWidth: image.clientWidth,
                boxHeight: image.clientHeight,
                baseScale,
              })
            : null;
          setAlphaState({ src: loadedSource, bounds, transform });
        });
      }}
      onError={() => {
        const nextIndex = sourceIndex + 1;
        if (nextIndex >= sources.length) onResolved?.('placeholder');
        setSelection({ key: sourceKey, index: nextIndex });
      }}
    />
  );
}
