import { useEffect, useRef, useState } from 'react';
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
import { getExternalPokemon3dModelUrl } from '../../visual-assets/pokemon3dExternal';
import '../asset-lab/generations-viewer.css';

type Props = {
  dex: number;
  name: string;
  onReadyChange?: (ready: boolean) => void;
  onFailed?: () => void;
};

type Runtime = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  dracoLoader: DRACOLoader;
  gltfLoader: GLTFLoader;
  model: Group | null;
  mixer: AnimationMixer | null;
  materials: Material[];
  textures: Texture[];
};

function disposeModel(runtime: Runtime) {
  runtime.mixer?.stopAllAction();
  runtime.mixer = null;
  if (runtime.model) {
    runtime.scene.remove(runtime.model);
    runtime.model.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) {
          if (value && typeof value === 'object' && 'isTexture' in value) {
            const texture = value as Texture;
            if (!runtime.textures.includes(texture)) runtime.textures.push(texture);
          }
        }
        if (!runtime.materials.includes(material)) runtime.materials.push(material);
      }
    });
    runtime.model = null;
  }
  for (const texture of runtime.textures) texture.dispose();
  for (const material of runtime.materials) material.dispose();
  runtime.textures = [];
  runtime.materials = [];
}

export function OwnedPokemonShiny3dViewer({
  dex,
  name,
  onReadyChange,
  onFailed,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    onReadyChange?.(status === 'ready');
  }, [onReadyChange, status]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;

    async function mount() {
      try {
        const [THREE, { GLTFLoader }, { DRACOLoader }, { OrbitControls }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/loaders/DRACOLoader.js'),
          import('three/examples/jsm/controls/OrbitControls.js'),
        ]);
        if (disposed) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.className = 'generations-canvas';
        host.replaceChildren(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x73807b, 1.45));
        const key = new THREE.DirectionalLight(0xffffff, 1.7);
        key.position.set(4, 6, 5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffd6ae, 0.5);
        rim.position.set(-4, 2, -3);
        scene.add(rim);

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/research/draco/');
        dracoLoader.preload();
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;

        const runtime: Runtime = {
          renderer,
          scene,
          camera,
          controls,
          dracoLoader,
          gltfLoader,
          model: null,
          mixer: null,
          materials: [],
          textures: [],
        };
        runtimeRef.current = runtime;

        const modelUrl = getExternalPokemon3dModelUrl(dex, 'shiny');
        if (!modelUrl) throw new Error('Shiny 3D indisponível para este registro.');

        const response = await fetch(modelUrl, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`shiny model HTTP ${response.status}`);
        const gltf = await gltfLoader.parseAsync(await response.arrayBuffer(), '');
        if (disposed) return;

        const model = gltf.scene;
        runtime.model = model;
        scene.add(model);
        model.updateMatrixWorld(true);

        if (gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          runtime.mixer = mixer;
          mixer.clipAction(gltf.animations[0]!).play();
        }

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z, 0.01);
        const distance = Math.max(maxDimension * 2.25, 0.8);
        camera.position.set(center.x + distance * 0.08, center.y + size.y * 0.02, center.z + distance);
        camera.near = Math.max(distance / 120, 0.01);
        camera.far = Math.max(distance * 24, maxDimension * 30, 20);
        camera.lookAt(center);
        controls.target.copy(center);
        controls.minDistance = Math.max(distance * 0.72, maxDimension * 0.65);
        controls.maxDistance = Math.max(distance * 1.6, maxDimension * 1.8);
        controls.update();

        const clock = new THREE.Clock();
        const render = () => {
          if (disposed) return;
          frame = requestAnimationFrame(render);
          runtime.mixer?.update(Math.min(clock.getDelta(), 0.05));
          controls.update();
          renderer.render(scene, camera);
        };

        const resize = () => {
          const width = Math.max(host.clientWidth, 1);
          const height = Math.max(host.clientHeight, 1);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();
        setStatus('ready');
        render();
      } catch (error) {
        console.warn(`Shiny 3D viewer unavailable for #${dex}`, error);
        if (!disposed) {
          setStatus('failed');
          onFailed?.();
        }
      }
    }

    void mount();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
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
  }, [dex, onFailed]);

  return (
    <div className="generations-demo" data-pokemon-variant="shiny">
      <div className="generations-viewer-shell">
        <div
          ref={hostRef}
          className="generations-host"
          role="region"
          aria-label={`Modelo 3D shiny de ${name}`}
        />
        {status === 'loading' ? <span className="generations-status">CARREGANDO SHINY 3D</span> : null}
      </div>
    </div>
  );
}
