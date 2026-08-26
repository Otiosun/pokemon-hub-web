import type { AnimationAction, KeyframeTrack, Mesh } from 'three';
import { useEffect, useRef, useState } from 'react';

type MotionSeries = {
  times: number[];
  values: number[];
};

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

type MotionPayload = {
  provider: string;
  species: string;
  dex: number;
  scale: number;
  model: string;
  textures: {
    body: string;
    shinyBody: string;
    eyes: string;
    fire: string;
  };
  missingAnimationNodes: string[];
  animations: Record<string, MotionClip>;
};

type ViewerState = 'loading' | 'ready' | 'failed';

const animationOrder = ['idle', 'battleidle', 'walk', 'glad', 'attack'] as const;

const labels: Record<(typeof animationOrder)[number], string> = {
  idle: 'Idle',
  battleidle: 'Battle idle',
  walk: 'Walk',
  glad: 'Happy',
  attack: 'Attack',
};

const TAP_MOVE_THRESHOLD_PX = 10;
const TAP_TIME_THRESHOLD_MS = 450;

export function GenerationsCharmanderViewer() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<((name: string) => void) | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>('loading');
  const [activeAnimation, setActiveAnimation] = useState('idle');
  const [matchedTracks, setMatchedTracks] = useState(0);
  const [totalTracks, setTotalTracks] = useState(0);
  const [clipInfo, setClipInfo] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frameId = 0;
    let resizeObserver: ResizeObserver | undefined;
    let visibilityObserver: IntersectionObserver | undefined;
    let cleanup: (() => void) | undefined;

    async function boot(mount: HTMLDivElement) {
      try {
        setViewerState('loading');
        setErrorDetail('');
        const base = '/research/generations/charmander';
        const [THREE, { GLTFLoader }, { DRACOLoader }, { OrbitControls }, motionResponse] =
          await Promise.all([
            import('three'),
            import('three/examples/jsm/loaders/GLTFLoader.js'),
            import('three/examples/jsm/loaders/DRACOLoader.js'),
            import('three/examples/jsm/controls/OrbitControls.js'),
            fetch(`${base}/motion.json`),
          ]);

        if (!motionResponse.ok) throw new Error(`motion.json HTTP ${motionResponse.status}`);
        const payload = (await motionResponse.json()) as MotionPayload;
        if (disposed) return;

        const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const renderer = new THREE.WebGLRenderer({
          antialias: !coarsePointer,
          alpha: true,
          powerPreference: 'low-power',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.35 : 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.domElement.className = 'generations-canvas';
        mount.replaceChildren(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);

        const hemi = new THREE.HemisphereLight(0xffffff, 0x758070, 2.3);
        scene.add(hemi);
        const key = new THREE.DirectionalLight(0xffffff, 3.1);
        key.position.set(4, 6, 5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffd8b2, 1.2);
        rim.position.set(-4, 2, -3);
        scene.add(rim);

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/research/draco/');
        dracoLoader.preload();

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        const textureLoader = new THREE.TextureLoader();
        const [gltf, bodyTexture, eyesTexture, fireTexture] = await Promise.all([
          loader.loadAsync(`${base}/${payload.model}`),
          textureLoader.loadAsync(`${base}/${payload.textures.body}`),
          textureLoader.loadAsync(`${base}/${payload.textures.eyes}`),
          textureLoader.loadAsync(`${base}/${payload.textures.fire}`),
        ]);
        if (disposed) {
          dracoLoader.dispose();
          return;
        }

        for (const texture of [bodyTexture, eyesTexture, fireTexture]) {
          texture.flipY = false;
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;
        }

        const bodyMaterial = new THREE.MeshStandardMaterial({ map: bodyTexture, roughness: 0.72, metalness: 0 });
        const eyesMaterial = new THREE.MeshStandardMaterial({
          map: eyesTexture,
          roughness: 0.6,
          metalness: 0,
          transparent: true,
          alphaTest: 0.02,
        });
        const fireMaterial = new THREE.MeshBasicMaterial({
          map: fireTexture,
          transparent: true,
          alphaTest: 0.02,
          depthWrite: false,
          side: THREE.DoubleSide,
        });

        const model = gltf.scene;
        model.scale.setScalar(payload.scale);
        scene.add(model);

        const namedNodes = new Set<string>();
        model.traverse((object) => {
          if (object.name) namedNodes.add(object.name);
          const mesh = object as Mesh;
          if (!mesh.isMesh) return;
          const name = mesh.name.toLowerCase();
          if (name.includes('fire')) mesh.material = fireMaterial;
          else if (name.includes('eye')) mesh.material = eyesMaterial;
          else mesh.material = bodyMaterial;
        });

        const mixer = new THREE.AnimationMixer(model);
        const actions = new Map<string, AnimationAction>();
        const clipMetadata = new Map<string, MotionClip>();

        for (const [name, motion] of Object.entries(payload.animations)) {
          const tracks: KeyframeTrack[] = [];
          let matched = 0;
          for (const bone of motion.tracks) {
            if (!namedNodes.has(bone.name)) continue;
            matched += 1;
            if (bone.position && bone.position.times.length > 0) {
              tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.position`, bone.position.times, bone.position.values, THREE.InterpolateLinear));
            }
            if (bone.rotation && bone.rotation.times.length > 0) {
              tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, bone.rotation.times, bone.rotation.values, THREE.InterpolateLinear));
            }
            if (bone.scale && bone.scale.times.length > 0) {
              tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.scale`, bone.scale.times, bone.scale.values, THREE.InterpolateLinear));
            }
          }

          const clip = new THREE.AnimationClip(`Generations:${name}`, motion.duration, tracks);
          const action = mixer.clipAction(clip);
          action.clampWhenFinished = !motion.loop;
          action.setLoop(motion.loop ? THREE.LoopRepeat : THREE.LoopOnce, motion.loop ? Infinity : 1);
          actions.set(name, action);
          clipMetadata.set(name, motion);

          if (name === 'idle') {
            setMatchedTracks(matched);
            setTotalTracks(motion.tracks.length);
          }
        }

        let currentAction: AnimationAction | undefined;
        const play = (name: string, fadeSeconds = 0.12) => {
          const next = actions.get(name) ?? actions.get('idle');
          if (!next) return;
          if (currentAction && currentAction !== next) currentAction.fadeOut(fadeSeconds);
          next.reset().fadeIn(fadeSeconds).play();
          currentAction = next;
          const metadata = clipMetadata.get(name) ?? clipMetadata.get('idle');
          if (metadata) {
            setClipInfo(`${metadata.keyFrames} frames · ${metadata.fps} FPS · ${metadata.duration.toFixed(2)} s`);
          }
          setActiveAnimation(name);
        };
        playRef.current = play;

        const happyAction = actions.get('glad');
        const handleFinished = (event: { action?: AnimationAction }) => {
          if (event.action === happyAction && !disposed) play('idle', 0.16);
        };
        mixer.addEventListener('finished', handleFinished);

        play('idle', 0);
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

        let pointerStart: { x: number; y: number; at: number } | undefined;
        const handlePointerDown = (event: PointerEvent) => {
          pointerStart = { x: event.clientX, y: event.clientY, at: performance.now() };
        };
        const handlePointerUp = (event: PointerEvent) => {
          if (!pointerStart) return;
          const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
          const elapsed = performance.now() - pointerStart.at;
          pointerStart = undefined;
          if (distance <= TAP_MOVE_THRESHOLD_PX && elapsed <= TAP_TIME_THRESHOLD_MS) play('glad', 0.1);
        };
        const handlePointerCancel = () => {
          pointerStart = undefined;
        };
        const canvas = renderer.domElement;
        canvas.addEventListener('pointerdown', handlePointerDown, { passive: true });
        canvas.addEventListener('pointerup', handlePointerUp, { passive: true });
        canvas.addEventListener('pointercancel', handlePointerCancel, { passive: true });

        const clock = new THREE.Clock();
        let inViewport = true;
        let pageVisible = !document.hidden;
        let running = false;

        const render = () => {
          if (disposed || !running) return;
          mixer.update(Math.min(clock.getDelta(), 0.05));
          controls.update();
          renderer.render(scene, camera);
          frameId = requestAnimationFrame(render);
        };
        const syncLoop = () => {
          const shouldRun = inViewport && pageVisible && !disposed;
          if (shouldRun === running) return;
          running = shouldRun;
          cancelAnimationFrame(frameId);
          if (running) {
            clock.getDelta();
            frameId = requestAnimationFrame(render);
          }
        };
        const handleVisibility = () => {
          pageVisible = !document.hidden;
          syncLoop();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        visibilityObserver = new IntersectionObserver(
          ([entry]) => {
            inViewport = Boolean(entry?.isIntersecting);
            syncLoop();
          },
          { rootMargin: '120px 0px' },
        );
        visibilityObserver.observe(mount);

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
          resizeObserver?.disconnect();
          visibilityObserver?.disconnect();
          document.removeEventListener('visibilitychange', handleVisibility);
          canvas.removeEventListener('pointerdown', handlePointerDown);
          canvas.removeEventListener('pointerup', handlePointerUp);
          canvas.removeEventListener('pointercancel', handlePointerCancel);
          mixer.removeEventListener('finished', handleFinished);
          controls.dispose();
          mixer.stopAllAction();
          dracoLoader.dispose();
          bodyTexture.dispose();
          eyesTexture.dispose();
          fireTexture.dispose();
          bodyMaterial.dispose();
          eyesMaterial.dispose();
          fireMaterial.dispose();
          model.traverse((object) => {
            const mesh = object as Mesh;
            if (mesh.isMesh) mesh.geometry?.dispose();
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (error) {
        console.error('Generations Charmander viewer failed', error);
        if (!disposed) {
          setErrorDetail(error instanceof Error ? error.message : String(error));
          setViewerState('failed');
        }
      }
    }

    void boot(host);
    return () => {
      disposed = true;
      playRef.current = null;
      cleanup?.();
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
    };
  }, []);

  const playAnimation = (name: string) => {
    playRef.current?.(name);
  };

  return (
    <div className="generations-demo">
      <div className="generations-viewer-shell">
        <div ref={hostRef} className="generations-host" role="img" aria-label="Charmander 3D do Generations com animação autoral" />
        {viewerState === 'loading' && <div className="generations-loading">carregando rig + idle…</div>}
        {viewerState === 'failed' && (
          <div className="generations-error">
            <strong>Falha ao inicializar o benchmark do Generations.</strong>
            {errorDetail && <code>{errorDetail}</code>}
          </div>
        )}
        <div className="generations-status" aria-live="polite">
          <strong>{viewerState === 'ready' ? 'Generations · motion real' : 'Preparando…'}</strong>
          {viewerState === 'ready' && <span>{matchedTracks}/{totalTracks} tracks do idle ligados · {clipInfo}</span>}
        </div>
      </div>

      <fieldset className="generations-motion-controls">
        <legend>Animações reais do Charmander</legend>
        {animationOrder.map((animation) => (
          <button key={animation} type="button" className={activeAnimation === animation ? 'is-active' : ''} disabled={viewerState !== 'ready'} onClick={() => playAnimation(animation)}>
            {labels[animation]}
          </button>
        ))}
      </fieldset>
    </div>
  );
}