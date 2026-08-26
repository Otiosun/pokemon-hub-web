import { useEffect, useRef, useState } from 'react';
import type { StarterVisualManifest } from '../../visual-assets/starterManifest';

type Props = {
  pokemon: StarterVisualManifest;
};

type ViewerState = 'loading' | 'ready' | 'failed';
type Axis = 'x' | 'y' | 'z';

type BoneMotion = {
  bone: string;
  axis: Axis;
  amplitude: number;
  speed: number;
  phase?: number;
};

const motionProfiles: Partial<Record<StarterVisualManifest['id'], readonly BoneMotion[]>> = {
  4: [
    { bone: 'Spine1', axis: 'x', amplitude: 0.045, speed: 0.34 },
    { bone: 'Spine2', axis: 'x', amplitude: 0.06, speed: 0.34, phase: 0.45 },
    { bone: 'Head', axis: 'x', amplitude: 0.035, speed: 0.28, phase: 0.8 },
    { bone: 'Head', axis: 'z', amplitude: 0.045, speed: 0.18, phase: 1.1 },
    { bone: 'LArm', axis: 'z', amplitude: 0.05, speed: 0.34, phase: 0.35 },
    { bone: 'RArm', axis: 'z', amplitude: 0.05, speed: 0.34, phase: Math.PI + 0.35 },
    { bone: 'Tail1', axis: 'z', amplitude: 0.05, speed: 0.24 },
    { bone: 'Tail2', axis: 'z', amplitude: 0.075, speed: 0.24, phase: 0.35 },
    { bone: 'Tail3', axis: 'z', amplitude: 0.1, speed: 0.24, phase: 0.7 },
    { bone: 'Tail4', axis: 'z', amplitude: 0.125, speed: 0.24, phase: 1.05 },
    { bone: 'Tail5', axis: 'z', amplitude: 0.15, speed: 0.24, phase: 1.4 },
    { bone: 'Tail6', axis: 'z', amplitude: 0.175, speed: 0.24, phase: 1.75 },
  ],
  7: [
    { bone: 'Waist', axis: 'x', amplitude: 0.055, speed: 0.32 },
    { bone: 'Head', axis: 'x', amplitude: 0.04, speed: 0.26, phase: 0.55 },
    { bone: 'Head', axis: 'z', amplitude: 0.05, speed: 0.17, phase: 1.2 },
    { bone: 'LArm', axis: 'z', amplitude: 0.055, speed: 0.32, phase: 0.25 },
    { bone: 'RArm', axis: 'z', amplitude: 0.055, speed: 0.32, phase: Math.PI + 0.25 },
    { bone: 'Tail1', axis: 'z', amplitude: 0.08, speed: 0.22 },
    { bone: 'Tail2', axis: 'z', amplitude: 0.12, speed: 0.22, phase: 0.55 },
    { bone: 'Tail3', axis: 'z', amplitude: 0.16, speed: 0.22, phase: 1.1 },
  ],
};

export function ProceduralPokemonViewer({ pokemon }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>('loading');
  const [boneCount, setBoneCount] = useState(0);
  const [animatedBoneCount, setAnimatedBoneCount] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let resizeObserver: ResizeObserver | undefined;

    async function boot(mount: HTMLDivElement) {
      try {
        setViewerState('loading');

        const [THREE, { GLTFLoader }, { DRACOLoader }, { OrbitControls }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/loaders/DRACOLoader.js'),
          import('three/examples/jsm/controls/OrbitControls.js'),
        ]);

        if (disposed) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.className = 'procedural-canvas';
        mount.replaceChildren(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x899083, 2.3));
        const key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(3, 4, 5);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xcddcff, 0.85);
        fill.position.set(-4, 2, 1);
        scene.add(fill);

        const draco = new DRACOLoader();
        draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        const loader = new GLTFLoader();
        loader.setDRACOLoader(draco);

        const gltf = await loader.loadAsync(pokemon.model3d.url);
        if (disposed) {
          draco.dispose();
          return;
        }

        const model = gltf.scene;
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const radius = Math.max(size.x, size.y, size.z) * 0.5;
        camera.position.set(radius * 0.35, radius * 0.12, Math.max(radius * 3.45, 1.4));
        camera.lookAt(0, 0, 0);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = Math.max(radius * 1.6, 0.7);
        controls.maxDistance = Math.max(radius * 6, 3);
        controls.target.set(0, 0, 0);
        controls.update();

        const bones = new Map<string, InstanceType<typeof THREE.Bone>>();
        model.traverse((object) => {
          if ((object as InstanceType<typeof THREE.Bone>).isBone) {
            const bone = object as InstanceType<typeof THREE.Bone>;
            bones.set(bone.name, bone);
          }
        });

        const profile = motionProfiles[pokemon.id] ?? [];
        const motions = profile
          .map((motion) => {
            const bone = bones.get(motion.bone);
            if (!bone) return null;
            return {
              ...motion,
              bone,
              base: bone.rotation[motion.axis],
            };
          })
          .filter((motion): motion is NonNullable<typeof motion> => motion !== null);

        setBoneCount(bones.size);
        setAnimatedBoneCount(motions.length);
        setViewerState('ready');

        const startedAt = performance.now();

        const render = (now: number) => {
          if (disposed) return;
          const seconds = (now - startedAt) / 1000;

          for (const motion of motions) {
            motion.bone.rotation[motion.axis] =
              motion.base +
              Math.sin(seconds * motion.speed * Math.PI * 2 + (motion.phase ?? 0)) *
                motion.amplitude;
          }

          controls.update();
          renderer.render(scene, camera);
          frame = requestAnimationFrame(render);
        };

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
        frame = requestAnimationFrame(render);

        return () => {
          cancelAnimationFrame(frame);
          resizeObserver?.disconnect();
          controls.dispose();
          draco.dispose();
          model.traverse((object) => {
            const mesh = object as InstanceType<typeof THREE.Mesh>;
            if (!mesh.isMesh) return;
            mesh.geometry?.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) material?.dispose();
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (error) {
        console.error('Procedural 3D viewer failed', error);
        if (!disposed) setViewerState('failed');
        return undefined;
      }
    }

    let cleanup: (() => void) | undefined;
    void boot(host).then((result) => {
      cleanup = result;
      if (disposed) cleanup?.();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      cleanup?.();
    };
  }, [pokemon]);

  return (
    <div className="viewer-shell procedural-viewer-shell">
      <div
        ref={hostRef}
        className="procedural-host"
        role="img"
        aria-label={`Modelo 3D vivo de ${pokemon.name}`}
      />
      {viewerState === 'loading' && <div className="procedural-loading">carregando rig 3D…</div>}
      {viewerState === 'failed' && (
        <div className="procedural-error">Não foi possível inicializar o 3D vivo.</div>
      )}
      <div className="viewer-status" aria-live="polite">
        <span className={`status-dot status-${viewerState}`} />
        {viewerState === 'ready' ? 'idle esquelético ativo' : 'preparando rig…'}
        {viewerState === 'ready' && (
          <small>
            {animatedBoneCount}/{boneCount} bones em movimento
          </small>
        )}
      </div>
    </div>
  );
}
