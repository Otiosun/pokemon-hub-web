import type {
  AnimationMixer,
  Group,
  Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  Texture,
  WebGLRenderer,
} from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useEffect, useRef, useState } from 'react';
import { getExternalPokemon3dModelUrl } from '../../visual-assets/pokemon3dExternal';
import { getPokemonSpeciesVisualAssets } from '../../visual-assets/pokemonVisualRegistry';

type ThreeModule = typeof import('three');
type ViewerState = 'loading' | 'ready' | 'failed';

type Runtime = {
  THREE: ThreeModule;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  dracoLoader: DRACOLoader;
  gltfLoader: GLTFLoader;
  model: Group | null;
  mixer: AnimationMixer | null;
};

type Props = {
  species: string;
  name: string;
  onReadyChange?: (ready: boolean) => void;
  onDisplayedSpeciesChange?: (species: string) => void;
  onFailedSpeciesChange?: (species: string) => void;
};

type PokemonIdentity = {
  id: number;
};

function disposeMaterial(material: Material) {
  const values = Object.values(material as unknown as Record<string, unknown>);
  for (const value of values) {
    if (value && typeof value === 'object' && 'isTexture' in value && value.isTexture) {
      (value as Texture).dispose();
    }
  }
  material.dispose();
}

function disposeModel(runtime: Runtime) {
  runtime.mixer?.stopAllAction();
  runtime.mixer = null;
  const model = runtime.model;
  if (!model) return;

  runtime.scene.remove(model);
  const disposedMaterials = new Set<Material>();
  model.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material || disposedMaterials.has(material)) continue;
      disposedMaterials.add(material);
      disposeMaterial(material);
    }
  });
  runtime.model = null;
}

function disposeDetached(model: Group) {
  const disposedMaterials = new Set<Material>();
  model.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material || disposedMaterials.has(material)) continue;
      disposedMaterials.add(material);
      disposeMaterial(material);
    }
  });
}

function frameModel(runtime: Runtime, model: Group) {
  const { THREE, camera, controls } = runtime;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 0.01);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.01));
  const fitHeight = (Math.max(size.y, 0.01) * 0.5) / Math.tan(verticalFov / 2);
  const fitWidth = (Math.max(size.x, 0.01) * 0.5) / Math.tan(horizontalFov / 2);
  const depthAllowance = Math.max(size.z, maxDimension * 0.14) * 0.5;
  const aspectMargin = camera.aspect < 0.72 ? 1.34 : camera.aspect < 1 ? 1.25 : 1.16;
  const distance = Math.max((Math.max(fitHeight, fitWidth) + depthAllowance) * aspectMargin, 0.8);

  camera.position.set(center.x + distance * 0.08, center.y + size.y * 0.02, center.z + distance);
  camera.near = Math.max(distance / 120, 0.01);
  camera.far = Math.max(distance * 24, maxDimension * 30, 20);
  camera.updateProjectionMatrix();
  camera.lookAt(center);

  controls.target.copy(center);
  controls.minDistance = Math.max(distance * 0.9, maxDimension * 0.78);
  controls.maxDistance = Math.max(distance * 1.5, maxDimension * 1.8);
  controls.update();
}

async function resolveNationalDex(species: string, signal: AbortSignal) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(species)}`, {
    signal,
    cache: 'force-cache',
  });
  if (!response.ok) throw new Error(`PokéAPI HTTP ${response.status}`);
  const payload = (await response.json()) as PokemonIdentity;
  if (!Number.isInteger(payload.id)) throw new Error('PokéAPI retornou um National Dex inválido');
  return payload.id;
}

function preloadArtwork(dex: number) {
  const artwork = getPokemonSpeciesVisualAssets(dex).artworkOfficial;
  const image = new Image();
  image.decoding = 'async';
  image.src = artwork;
}

export function ExternalPokemonViewer({
  species,
  name,
  onReadyChange,
  onDisplayedSpeciesChange,
  onFailedSpeciesChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const loadVersionRef = useRef(0);
  const displayedSpeciesCallbackRef = useRef(onDisplayedSpeciesChange);
  const failedSpeciesCallbackRef = useRef(onFailedSpeciesChange);
  const [engineReady, setEngineReady] = useState(false);
  const [viewerState, setViewerState] = useState<ViewerState>('loading');
  const [displayedName, setDisplayedName] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  useEffect(() => {
    displayedSpeciesCallbackRef.current = onDisplayedSpeciesChange;
  }, [onDisplayedSpeciesChange]);

  useEffect(() => {
    failedSpeciesCallbackRef.current = onFailedSpeciesChange;
  }, [onFailedSpeciesChange]);

  useEffect(() => {
    onReadyChange?.(viewerState === 'ready');
  }, [onReadyChange, viewerState]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frameId = 0;
    let running = false;
    let inViewport = true;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let removeVisibilityListener: (() => void) | undefined;

    async function initialise(mount: HTMLDivElement) {
      try {
        const [THREE, { GLTFLoader }, { DRACOLoader }, { OrbitControls }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/loaders/DRACOLoader.js'),
          import('three/examples/jsm/controls/OrbitControls.js'),
        ]);
        if (disposed) return;

        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        const renderer = new THREE.WebGLRenderer({
          antialias: !isTouch,
          alpha: true,
          powerPreference: 'low-power',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.15 : 1.6));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.domElement.className = 'generations-canvas';
        mount.replaceChildren(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x687977, 1.7));
        const key = new THREE.DirectionalLight(0xffffff, 2.1);
        key.position.set(4, 6, 5);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xddeeff, 0.75);
        fill.position.set(-4, 2, 4);
        scene.add(fill);

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/research/draco/');
        dracoLoader.preload();
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.rotateSpeed = isTouch ? 0.55 : 0.7;
        controls.zoomSpeed = 0.62;
        controls.minPolarAngle = THREE.MathUtils.degToRad(55);
        controls.maxPolarAngle = THREE.MathUtils.degToRad(120);

        const runtime: Runtime = {
          THREE,
          renderer,
          scene,
          camera,
          controls,
          dracoLoader,
          gltfLoader,
          model: null,
          mixer: null,
        };
        runtimeRef.current = runtime;

        const clock = new THREE.Clock();
        const frameInterval = isTouch ? 1000 / 30 : 0;
        let lastRenderedAt = 0;
        const render = (timestamp: number) => {
          if (disposed || !running) return;
          frameId = requestAnimationFrame(render);
          if (frameInterval > 0 && timestamp - lastRenderedAt < frameInterval) return;
          lastRenderedAt = timestamp;
          runtime.mixer?.update(Math.min(clock.getDelta(), 0.05));
          controls.update();
          renderer.render(scene, camera);
        };
        const syncLoop = () => {
          const shouldRun = inViewport && !document.hidden && !disposed;
          if (shouldRun && !running) {
            running = true;
            clock.getDelta();
            frameId = requestAnimationFrame(render);
          } else if (!shouldRun && running) {
            running = false;
            cancelAnimationFrame(frameId);
          }
        };

        const onVisibilityChange = () => syncLoop();
        document.addEventListener('visibilitychange', onVisibilityChange);
        removeVisibilityListener = () => document.removeEventListener('visibilitychange', onVisibilityChange);

        intersectionObserver = new IntersectionObserver(
          ([entry]) => {
            inViewport = Boolean(entry?.isIntersecting);
            syncLoop();
          },
          { rootMargin: '80px' },
        );
        intersectionObserver.observe(mount);

        const resize = () => {
          const width = Math.max(mount.clientWidth, 1);
          const height = Math.max(mount.clientHeight, 1);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          if (runtime.model) frameModel(runtime, runtime.model);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
        resize();
        syncLoop();
        setEngineReady(true);
      } catch (error) {
        console.error('External Pokemon renderer initialisation failed', error);
        if (!disposed) {
          setErrorDetail(error instanceof Error ? error.message : String(error));
          setViewerState('failed');
          failedSpeciesCallbackRef.current?.(species);
        }
      }
    }

    void initialise(host);

    return () => {
      disposed = true;
      loadVersionRef.current += 1;
      setEngineReady(false);
      cancelAnimationFrame(frameId);
      removeVisibilityListener?.();
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      const runtime = runtimeRef.current;
      if (runtime) {
        disposeModel(runtime);
        runtime.controls.dispose();
        runtime.dracoLoader.dispose();
        runtime.renderer.dispose();
        runtime.renderer.domElement.remove();
        runtimeRef.current = null;
      }
    };
  }, [species]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!engineReady || !runtime) return;

    const controller = new AbortController();
    const loadVersion = ++loadVersionRef.current;
    let cancelled = false;
    setViewerState('loading');
    setErrorDetail('');

    async function loadModel(activeRuntime: Runtime) {
      let pendingModel: Group | null = null;
      try {
        const dex = await resolveNationalDex(species, controller.signal);
        preloadArtwork(dex);
        const modelUrl = getExternalPokemon3dModelUrl(dex);
        if (!modelUrl) throw new Error(`National Dex ${dex} fora do catálogo 3D Gen I–III`);

        const gltf = await activeRuntime.gltfLoader.loadAsync(modelUrl);
        pendingModel = gltf.scene;
        if (cancelled || loadVersion !== loadVersionRef.current) {
          disposeDetached(pendingModel);
          return;
        }

        disposeModel(activeRuntime);
        const model = pendingModel;
        activeRuntime.scene.add(model);
        activeRuntime.model = model;
        pendingModel = null;

        const animation = gltf.animations[0];
        if (animation) {
          const mixer = new activeRuntime.THREE.AnimationMixer(model);
          mixer.clipAction(animation).play();
          activeRuntime.mixer = mixer;
        }

        frameModel(activeRuntime, model);
        activeRuntime.renderer.render(activeRuntime.scene, activeRuntime.camera);
        setDisplayedName(name);
        displayedSpeciesCallbackRef.current?.(species);
        setViewerState('ready');
      } catch (error) {
        if (pendingModel) disposeDetached(pendingModel);
        if (controller.signal.aborted || cancelled || loadVersion !== loadVersionRef.current) return;
        console.warn(`3D model unavailable for ${species}`, error);
        setErrorDetail(error instanceof Error ? error.message : String(error));
        setViewerState('failed');
        failedSpeciesCallbackRef.current?.(species);
      }
    }

    void loadModel(runtime);
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [engineReady, name, species]);

  return (
    <div className="generations-demo">
      <div className="generations-viewer-shell">
        <div
          ref={hostRef}
          className="generations-host"
          role="region"
          aria-label={`${displayedName || name} em 3D. Arraste para girar e use roda ou pinça para zoom.`}
        />
        {viewerState === 'loading' && !displayedName && (
          <div className="generations-loading">carregando {name}…</div>
        )}
        {viewerState === 'failed' && (
          <div className="generations-error">
            <strong>Modelo 3D indisponível.</strong>
            {errorDetail && <code>{errorDetail}</code>}
          </div>
        )}
        <div className="generations-status" aria-live="polite">
          <strong>{displayedName || name}</strong>
          <span>
            {viewerState === 'loading' && displayedName
              ? `${name} carregando · arraste = girar`
              : 'arraste = girar · roda ou pinça = zoom'}
          </span>
        </div>
      </div>
    </div>
  );
}
