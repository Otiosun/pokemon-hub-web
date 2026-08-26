import type {
  AnimationMixer,
  Group,
  Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  Texture,
  TextureLoader,
  WebGLRenderer,
} from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useEffect, useRef, useState } from 'react';

type MotionSeries = { times: number[]; values: number[] };
type BoneMotion = {
  name: string;
  position?: MotionSeries;
  rotation?: MotionSeries;
  scale?: MotionSeries;
};
type MotionClip = {
  name: string;
  loop: boolean;
  fps: number;
  keyFrames: number;
  duration: number;
  tracks: BoneMotion[];
};
type MaterialBinding = {
  texture: string;
  transparent: boolean;
  useLight: boolean;
  doubleSided: boolean;
};
type AssetPayload = {
  provider: string;
  providerVersion: string;
  species: string;
  dex: number;
  scale: number;
  model: string;
  materials: Record<string, MaterialBinding>;
  animations: { idle: MotionClip };
  missingAnimationNodes: string[];
  missingMaterials: string[];
};
type ViewerState = 'loading' | 'ready' | 'failed';
type ThreeModule = typeof import('three');

type Runtime = {
  THREE: ThreeModule;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  dracoLoader: DRACOLoader;
  gltfLoader: GLTFLoader;
  textureLoader: TextureLoader;
  model: Group | null;
  mixer: AnimationMixer | null;
  textures: Texture[];
  materials: Material[];
};

type Props = {
  species: string;
  name: string;
};

function disposeModel(runtime: Runtime) {
  runtime.mixer?.stopAllAction();
  runtime.mixer = null;
  if (runtime.model) {
    runtime.scene.remove(runtime.model);
    runtime.model.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) mesh.geometry?.dispose();
    });
    runtime.model = null;
  }
  for (const texture of runtime.textures) texture.dispose();
  for (const material of runtime.materials) material.dispose();
  runtime.textures = [];
  runtime.materials = [];
}

function disposeDetached(model: Group, textures: Texture[], materials: Material[]) {
  model.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.isMesh) mesh.geometry?.dispose();
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}

export function GenerationsPokemonViewer({ species, name }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const loadVersionRef = useRef(0);
  const [engineReady, setEngineReady] = useState(false);
  const [viewerState, setViewerState] = useState<ViewerState>('loading');
  const [displayedName, setDisplayedName] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

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
        renderer.toneMappingExposure = 1.08;
        renderer.domElement.className = 'generations-canvas';
        mount.replaceChildren(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x758070, 2.25));
        const key = new THREE.DirectionalLight(0xffffff, 3.0);
        key.position.set(4, 6, 5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffd8b2, 1.1);
        rim.position.set(-4, 2, -3);
        scene.add(rim);

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/research/draco/');
        dracoLoader.preload();
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);
        const textureLoader = new THREE.TextureLoader();
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;

        const runtime: Runtime = {
          THREE,
          renderer,
          scene,
          camera,
          controls,
          dracoLoader,
          gltfLoader,
          textureLoader,
          model: null,
          mixer: null,
          textures: [],
          materials: [],
        };
        runtimeRef.current = runtime;

        const clock = new THREE.Clock();
        const render = () => {
          if (disposed || !running) return;
          runtime.mixer?.update(Math.min(clock.getDelta(), 0.05));
          controls.update();
          renderer.render(scene, camera);
          frameId = requestAnimationFrame(render);
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
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
        resize();
        syncLoop();
        setEngineReady(true);
      } catch (error) {
        console.error('Generations renderer initialisation failed', error);
        if (!disposed) {
          setErrorDetail(error instanceof Error ? error.message : String(error));
          setViewerState('failed');
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
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current!;
    if (!engineReady || !runtime) return;

    const loadVersion = ++loadVersionRef.current;
    const controller = new AbortController();
    let cancelled = false;

    async function loadSpecies() {
      setViewerState('loading');
      setErrorDetail('');
      const base = `/research/generations/${species}`;
      let pendingTextures: Texture[] = [];
      let pendingMaterials: Material[] = [];
      let pendingModel: Group | null = null;

      try {
        const assetResponse = await fetch(`${base}/asset.json`, {
          signal: controller.signal,
          cache: 'force-cache',
        });
        if (!assetResponse.ok) throw new Error(`asset.json HTTP ${assetResponse.status}`);
        const payload = (await assetResponse.json()) as AssetPayload;
        if (payload.missingAnimationNodes.length > 0) {
          throw new Error(`animation nodes ausentes: ${payload.missingAnimationNodes.join(', ')}`);
        }
        if (payload.missingMaterials.length > 0) {
          throw new Error(`materiais ausentes: ${payload.missingMaterials.join(', ')}`);
        }

        const textureNames = [...new Set(Object.values(payload.materials).map((item) => item.texture))];
        const [texturePairs, modelResponse] = await Promise.all([
          Promise.all(
            textureNames.map(async (textureName) => {
              const texture = await runtime.textureLoader.loadAsync(`${base}/${textureName}`);
              texture.flipY = false;
              texture.wrapS = runtime.THREE.RepeatWrapping;
              texture.wrapT = runtime.THREE.RepeatWrapping;
              texture.colorSpace = runtime.THREE.SRGBColorSpace;
              texture.needsUpdate = true;
              pendingTextures.push(texture);
              return [textureName, texture] as const;
            }),
          ),
          fetch(`${base}/${payload.model}`, { signal: controller.signal, cache: 'force-cache' }),
        ]);
        if (!modelResponse.ok) throw new Error(`model.glb HTTP ${modelResponse.status}`);
        const modelBuffer = await modelResponse.arrayBuffer();
        const gltf = await runtime.gltfLoader.parseAsync(modelBuffer, `${base}/`);
        pendingModel = gltf.scene;

        if (cancelled || loadVersion !== loadVersionRef.current) {
          disposeDetached(pendingModel, pendingTextures, pendingMaterials);
          return;
        }

        const textures = new Map<string, Texture>(texturePairs);
        const model = pendingModel;
        model.scale.setScalar(payload.scale);
        const namedNodes = new Set<string>();
        model.traverse((object) => {
          if (object.name) namedNodes.add(object.name);
          const mesh = object as Mesh;
          if (!mesh.isMesh) return;
          const binding = payload.materials[mesh.name];
          if (!binding) return;
          const texture = textures.get(binding.texture);
          if (!texture) return;
          const side = binding.doubleSided ? runtime.THREE.DoubleSide : runtime.THREE.FrontSide;
          const common = {
            map: texture,
            transparent: binding.transparent,
            alphaTest: binding.transparent ? 0.01 : 0,
            side,
          };
          const material =
            !binding.useLight || mesh.name.toLowerCase().includes('fire')
              ? new runtime.THREE.MeshBasicMaterial({ ...common, depthWrite: !binding.transparent })
              : new runtime.THREE.MeshStandardMaterial({ ...common, roughness: 0.72, metalness: 0 });
          mesh.material = material;
          pendingMaterials.push(material);
        });

        const motion = payload.animations.idle;
        const tracks = [];
        for (const bone of motion.tracks) {
          if (!namedNodes.has(bone.name)) continue;
          if (bone.position?.times.length) {
            tracks.push(
              new runtime.THREE.VectorKeyframeTrack(
                `${bone.name}.position`,
                bone.position.times,
                bone.position.values,
                runtime.THREE.InterpolateLinear,
              ),
            );
          }
          if (bone.rotation?.times.length) {
            tracks.push(
              new runtime.THREE.QuaternionKeyframeTrack(
                `${bone.name}.quaternion`,
                bone.rotation.times,
                bone.rotation.values,
                runtime.THREE.InterpolateLinear,
              ),
            );
          }
          if (bone.scale?.times.length) {
            tracks.push(
              new runtime.THREE.VectorKeyframeTrack(
                `${bone.name}.scale`,
                bone.scale.times,
                bone.scale.values,
                runtime.THREE.InterpolateLinear,
              ),
            );
          }
        }
        const clip = new runtime.THREE.AnimationClip('Generations:idle', motion.duration, tracks);
        const mixer = new runtime.THREE.AnimationMixer(model);
        const idle = mixer.clipAction(clip);
        idle.setLoop(runtime.THREE.LoopRepeat, Infinity);
        idle.play();
        mixer.update(0);
        model.updateMatrixWorld(true);

        const box = new runtime.THREE.Box3().setFromObject(model);
        const size = box.getSize(new runtime.THREE.Vector3());
        const center = box.getCenter(new runtime.THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) * 0.5;

        if (cancelled || loadVersion !== loadVersionRef.current) {
          mixer.stopAllAction();
          disposeDetached(model, pendingTextures, pendingMaterials);
          return;
        }

        disposeModel(runtime);
        runtime.scene.add(model);
        runtime.model = model;
        runtime.mixer = mixer;
        runtime.textures = pendingTextures;
        runtime.materials = pendingMaterials;
        pendingTextures = [];
        pendingMaterials = [];
        pendingModel = null;

        runtime.camera.position.set(
          center.x + radius * 0.28,
          center.y + radius * 0.04,
          center.z + radius * 3.2,
        );
        runtime.camera.lookAt(center);
        runtime.controls.target.copy(center);
        runtime.controls.minDistance = Math.max(radius * 1.45, 0.6);
        runtime.controls.maxDistance = Math.max(radius * 5.2, 3.0);
        runtime.controls.update();

        setDisplayedName(name);
        setViewerState('ready');
      } catch (error) {
        if (pendingModel) disposeDetached(pendingModel, pendingTextures, pendingMaterials);
        else {
          for (const texture of pendingTextures) texture.dispose();
          for (const material of pendingMaterials) material.dispose();
        }
        if (controller.signal.aborted || cancelled || loadVersion !== loadVersionRef.current) return;
        console.error(`Generations ${species} viewer failed`, error);
        setErrorDetail(error instanceof Error ? error.message : String(error));
        setViewerState('failed');
      }
    }

    void loadSpecies();
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
        {viewerState === 'loading' && (
          <div className="generations-loading">carregando {name}…</div>
        )}
        {viewerState === 'failed' && (
          <div className="generations-error">
            <strong>Falha ao carregar {name}.</strong>
            {errorDetail && <code>{errorDetail}</code>}
          </div>
        )}
        <div className="generations-status" aria-live="polite">
          <strong>{displayedName ? `${displayedName} · Idle` : 'Preparando…'}</strong>
          <span>
            {viewerState === 'loading' && displayedName
              ? `${name} carregando em segundo plano · arraste = girar`
              : 'arraste = girar · roda ou pinça = zoom'}
          </span>
        </div>
      </div>
    </div>
  );
}
