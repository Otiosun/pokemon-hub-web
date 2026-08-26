import type { AnimationAction, KeyframeTrack, Material, Mesh, Texture } from 'three';
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
  animations: { idle: MotionClip; happy: MotionClip };
  missingAnimationNodes: string[];
  missingMaterials: string[];
};
type ViewerState = 'loading' | 'ready' | 'failed';

type Props = {
  species: string;
  name: string;
};

export function GenerationsPokemonViewer({ species, name }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const triggerHappyRef = useRef<(() => void) | null>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>('loading');
  const [emotion, setEmotion] = useState<'idle' | 'happy'>('idle');
  const [errorDetail, setErrorDetail] = useState('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frameId = 0;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let cleanup: (() => void) | undefined;

    async function boot(mount: HTMLDivElement) {
      try {
        setViewerState('loading');
        setEmotion('idle');
        setErrorDetail('');
        const base = `/research/generations/${species}`;
        const [THREE, { GLTFLoader }, { DRACOLoader }, { OrbitControls }, assetResponse] =
          await Promise.all([
            import('three'),
            import('three/examples/jsm/loaders/GLTFLoader.js'),
            import('three/examples/jsm/loaders/DRACOLoader.js'),
            import('three/examples/jsm/controls/OrbitControls.js'),
            fetch(`${base}/asset.json`),
          ]);

        if (!assetResponse.ok) throw new Error(`asset.json HTTP ${assetResponse.status}`);
        const payload = (await assetResponse.json()) as AssetPayload;
        if (payload.missingAnimationNodes.length > 0) {
          throw new Error(`animation nodes ausentes: ${payload.missingAnimationNodes.join(', ')}`);
        }
        if (payload.missingMaterials.length > 0) {
          throw new Error(`materiais ausentes: ${payload.missingMaterials.join(', ')}`);
        }
        if (disposed) return;

        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        const renderer = new THREE.WebGLRenderer({
          antialias: !isTouch,
          alpha: true,
          powerPreference: 'low-power',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.75));
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
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        const textureLoader = new THREE.TextureLoader();

        const textureNames = [...new Set(Object.values(payload.materials).map((item) => item.texture))];
        const texturePairs = await Promise.all(
          textureNames.map(async (textureName) => {
            const texture = await textureLoader.loadAsync(`${base}/${textureName}`);
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.needsUpdate = true;
            return [textureName, texture] as const;
          }),
        );
        const textures = new Map<string, Texture>(texturePairs);
        const gltf = await loader.loadAsync(`${base}/${payload.model}`);
        if (disposed) {
          dracoLoader.dispose();
          for (const texture of textures.values()) texture.dispose();
          return;
        }

        const materials: Material[] = [];
        const model = gltf.scene;
        model.scale.setScalar(payload.scale);
        scene.add(model);

        const namedNodes = new Set<string>();
        model.traverse((object) => {
          if (object.name) namedNodes.add(object.name);
          const mesh = object as Mesh;
          if (!mesh.isMesh) return;
          const binding = payload.materials[mesh.name];
          if (!binding) return;
          const texture = textures.get(binding.texture);
          if (!texture) return;
          const side = binding.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
          const common = {
            map: texture,
            transparent: binding.transparent,
            alphaTest: binding.transparent ? 0.01 : 0,
            side,
          };
          const material =
            !binding.useLight || mesh.name.toLowerCase().includes('fire')
              ? new THREE.MeshBasicMaterial({ ...common, depthWrite: !binding.transparent })
              : new THREE.MeshStandardMaterial({ ...common, roughness: 0.72, metalness: 0 });
          mesh.material = material;
          materials.push(material);
        });

        const mixer = new THREE.AnimationMixer(model);
        const actions = new Map<string, AnimationAction>();
        for (const [animationName, motion] of Object.entries(payload.animations)) {
          const tracks: KeyframeTrack[] = [];
          for (const bone of motion.tracks) {
            if (!namedNodes.has(bone.name)) continue;
            if (bone.position?.times.length) {
              tracks.push(
                new THREE.VectorKeyframeTrack(
                  `${bone.name}.position`,
                  bone.position.times,
                  bone.position.values,
                  THREE.InterpolateLinear,
                ),
              );
            }
            if (bone.rotation?.times.length) {
              tracks.push(
                new THREE.QuaternionKeyframeTrack(
                  `${bone.name}.quaternion`,
                  bone.rotation.times,
                  bone.rotation.values,
                  THREE.InterpolateLinear,
                ),
              );
            }
            if (bone.scale?.times.length) {
              tracks.push(
                new THREE.VectorKeyframeTrack(
                  `${bone.name}.scale`,
                  bone.scale.times,
                  bone.scale.values,
                  THREE.InterpolateLinear,
                ),
              );
            }
          }
          const clip = new THREE.AnimationClip(`Generations:${animationName}`, motion.duration, tracks);
          const action = mixer.clipAction(clip);
          action.clampWhenFinished = animationName === 'happy';
          action.setLoop(animationName === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce, animationName === 'idle' ? Infinity : 1);
          actions.set(animationName, action);
        }

        const idle = actions.get('idle');
        const happy = actions.get('happy');
        if (!idle || !happy) throw new Error('par Idle/Happy não foi criado');
        let reacting = false;

        const playIdle = () => {
          happy.stop();
          idle.reset().fadeIn(0.12).play();
          reacting = false;
          setEmotion('idle');
        };
        const playHappy = () => {
          if (reacting) return;
          reacting = true;
          idle.fadeOut(0.1);
          happy.reset().fadeIn(0.1).play();
          setEmotion('happy');
        };
        const handleFinished = (event: { action: AnimationAction }) => {
          if (event.action !== happy) return;
          happy.fadeOut(0.08);
          playIdle();
        };
        mixer.addEventListener('finished', handleFinished);
        triggerHappyRef.current = playHappy;
        playIdle();
        mixer.update(0);
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) * 0.5;
        camera.position.set(center.x + radius * 0.28, center.y + radius * 0.04, center.z + radius * 3.2);
        camera.lookAt(center);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.target.copy(center);
        controls.minDistance = Math.max(radius * 1.45, 0.6);
        controls.maxDistance = Math.max(radius * 5.2, 3.0);
        controls.update();

        let inViewport = true;
        let running = false;
        const clock = new THREE.Clock();
        const render = () => {
          if (disposed || !running) return;
          mixer.update(Math.min(clock.getDelta(), 0.05));
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
        setViewerState('ready');
        syncLoop();

        cleanup = () => {
          running = false;
          cancelAnimationFrame(frameId);
          document.removeEventListener('visibilitychange', onVisibilityChange);
          intersectionObserver?.disconnect();
          resizeObserver?.disconnect();
          mixer.removeEventListener('finished', handleFinished);
          mixer.stopAllAction();
          controls.dispose();
          dracoLoader.dispose();
          for (const texture of textures.values()) texture.dispose();
          for (const material of materials) material.dispose();
          model.traverse((object) => {
            const mesh = object as Mesh;
            if (mesh.isMesh) mesh.geometry?.dispose();
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (error) {
        console.error(`Generations ${species} viewer failed`, error);
        if (!disposed) {
          setErrorDetail(error instanceof Error ? error.message : String(error));
          setViewerState('failed');
        }
      }
    }

    void boot(host);
    return () => {
      disposed = true;
      triggerHappyRef.current = null;
      cleanup?.();
      cancelAnimationFrame(frameId);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
    };
  }, [species]);

  const triggerHappy = () => triggerHappyRef.current?.();

  return (
    <div className="generations-demo">
      <div className="generations-viewer-shell">
        <div
          ref={hostRef}
          className="generations-host"
          role="button"
          tabIndex={0}
          aria-label={`${name} 3D. Toque para ele reagir feliz.`}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              triggerHappy();
            }
          }}
          onPointerDown={(event) => {
            pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
          }}
          onPointerMove={(event) => {
            const pointer = pointerRef.current;
            if (!pointer || pointer.id !== event.pointerId) return;
            if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) pointer.moved = true;
          }}
          onPointerUp={(event) => {
            const pointer = pointerRef.current;
            pointerRef.current = null;
            if (pointer && pointer.id === event.pointerId && !pointer.moved) triggerHappy();
          }}
          onPointerCancel={() => {
            pointerRef.current = null;
          }}
        />
        {viewerState === 'loading' && <div className="generations-loading">carregando {name}…</div>}
        {viewerState === 'failed' && (
          <div className="generations-error">
            <strong>Falha ao carregar {name}.</strong>
            {errorDetail && <code>{errorDetail}</code>}
          </div>
        )}
        <div className="generations-status" aria-live="polite">
          <strong>{viewerState === 'ready' ? `${name} · ${emotion === 'happy' ? 'Happy' : 'Idle'}` : 'Preparando…'}</strong>
          {viewerState === 'ready' && <span>toque curto = Happy · arraste = girar</span>}
        </div>
      </div>
    </div>
  );
}
