import { Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene, SRGBColorSpace, TextureLoader, WebGLRenderer, type Texture } from 'three';
import { projectLayer, STAGE_NEAR, SVG_UNITS_PER_WORLD, type StageCamera } from './geometry';
import { stageRenderPlan, type RenderLayer } from './render-plan';
import type { Playback } from './playback';
import { serializeSvg, type SvgAsset, type SvgNode } from './svg-tree';

export type GpuStageProps = {
  width: number; height: number; camera: StageCamera; layers: readonly RenderLayer[];
  playback: Playback; animate: boolean; hiddenLayerId?: string | null;
  onMode: (mode: 'webgl2' | 'svg') => void;
};
type Plane = {
  identity: string; mesh: Mesh<PlaneGeometry, MeshBasicMaterial>; texture: Texture;
  url: string | null; ready: boolean; disposed: boolean;
};
export type StageRenderer = { update: (props: GpuStageProps) => void; dispose: () => void };

function needsNativeSvg(node: SvgNode): boolean {
  // A texture bakes stroke widths into pixels, whereas vector-effect keeps
  // these strokes constant through layer scaling and camera projection.
  // Text also stays native so standalone-image font defaults cannot replace
  // the live SVG's inherited font and size; there is no font pipeline yet.
  return node.tag === 'text' || node.attributes['vector-effect']?.trim() === 'non-scaling-stroke' || node.children.some(needsNativeSvg);
}

/** One compositor; the injected shared playback is the only frame clock. */
export function createStageRenderer(canvas: HTMLCanvasElement, initial: GpuStageProps): StageRenderer {
  let current = initial;
  let disposed = false;
  let renderer: WebGLRenderer | null = null;
  let unsubscribe: (() => void) | null = null;
  let subscribedPlayback: Playback | null = null;
  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, STAGE_NEAR, 1000);
  const planes = new Map<string, Plane>();
  const loader = new TextureLoader();

  function releaseUrl(plane: Plane) { if (plane.url !== null) URL.revokeObjectURL(plane.url); plane.url = null; }
  function release(plane: Plane) {
    if (plane.disposed) return;
    plane.disposed = true;
    releaseUrl(plane);
    scene.remove(plane.mesh);
    plane.texture.dispose();
    plane.mesh.geometry.dispose();
    plane.mesh.material.dispose();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    unsubscribe?.(); unsubscribe = null;
    canvas.removeEventListener('webglcontextlost', lost);
    for (const plane of planes.values()) release(plane);
    planes.clear();
    renderer?.dispose(); renderer = null;
  }
  function fallback() { if (disposed) return; canvas.style.visibility = 'hidden'; dispose(); current.onMode('svg'); }
  function lost(event: Event) { event.preventDefault(); fallback(); }

  function draw() {
    if (disposed || renderer === null) return;
    const { width, height } = current;
    if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) return;
    if (![current.camera.position.x, current.camera.position.y, current.camera.position.z, current.camera.fovDeg].every(Number.isFinite) || current.camera.fovDeg <= 0 || current.camera.fovDeg >= 180) { renderer.clear(); return; }
    for (const plane of planes.values()) plane.mesh.visible = false;
    const plan = stageRenderPlan(current.layers, current.playback.getSnapshot().timeMs, current.animate, current.hiddenLayerId);
    camera.fov = current.camera.fovDeg;
    camera.aspect = width / height;
    camera.position.set(current.camera.position.x, current.camera.position.y, current.camera.position.z);
    let far = 1000;
    for (let index = 0; index < plan.length; index++) {
      const layer = plan[index];
      const plane = planes.get(layer.id);
      if (!plane?.ready || layer.svg === null || !projectLayer(layer.transform, current.camera, { width, height }, layer.svg.viewBox)) continue;
      const { transform } = layer;
      const distance = current.camera.position.z - transform.z;
      // Float32 GPU matrices cannot represent every finite authored double. The
      // native SVG compositor remains available for those exact documents.
      if (![transform.x, transform.y, transform.z, transform.scale, distance].every(value => Math.abs(value) < 1e30)) { fallback(); return; }
      far = Math.max(far, distance * 2);
      plane.mesh.position.set(transform.x, transform.y, transform.z);
      plane.mesh.scale.setScalar(transform.scale);
      plane.mesh.rotation.z = (transform.rotationDeg % 360) * Math.PI / 180;
      plane.mesh.renderOrder = index;
      plane.mesh.material.opacity = layer.opacity ?? 1;
      plane.mesh.visible = true;
    }
    camera.far = far;
    camera.updateProjectionMatrix();
    try { renderer.render(scene, camera); } catch { fallback(); }
  }

  function makePlane(asset: SvgAsset): Plane {
    const url = URL.createObjectURL(new Blob([serializeSvg(asset)], { type: 'image/svg+xml' }));
    const geometry = new PlaneGeometry(asset.viewBox.width / SVG_UNITS_PER_WORLD, asset.viewBox.height / SVG_UNITS_PER_WORLD);
    const material = new MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    const plane: Plane = { identity: `${asset.assetId}:${asset.uri}`, mesh, url, ready: false, disposed: false, texture: null! };
    plane.texture = loader.load(url, texture => {
      releaseUrl(plane);
      if (disposed || plane.disposed) { texture.dispose(); return; }
      texture.colorSpace = SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
      plane.ready = true;
      draw();
    }, undefined, () => {
      releaseUrl(plane);
      if (!disposed && !plane.disposed) fallback();
    });
    return plane;
  }

  function update(props: GpuStageProps) {
    if (disposed || renderer === null) return;
    current = props;
    if (props.layers.some(layer => layer.rig || (layer.svg !== null && needsNativeSvg(layer.svg.root)))) { fallback(); return; }
    if (subscribedPlayback !== props.playback) {
      unsubscribe?.();
      subscribedPlayback = props.playback;
      unsubscribe = props.playback.subscribe(draw);
    }
    if (Number.isFinite(props.width) && Number.isFinite(props.height) && props.width > 0 && props.height > 0) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(props.width, props.height, false);
    }
    const active = new Set(props.layers.filter(layer => layer.svg !== null).map(layer => layer.id));
    for (const [id, plane] of planes) if (!active.has(id)) { release(plane); planes.delete(id); }
    try {
      for (const layer of props.layers) {
        if (!layer.svg) continue;
        const previous = planes.get(layer.id);
        const identity = `${layer.svg.assetId}:${layer.svg.uri}`;
        if (previous?.identity === identity) continue;
        if (previous) { release(previous); planes.delete(layer.id); }
        planes.set(layer.id, makePlane(layer.svg));
      }
    } catch { fallback(); return; }
    draw();
  }

  // Preflight directly: constructing Three's renderer without a usable context
  // emits a console error even when lack of WebGL is an expected fallback.
  try {
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!context || context.isContextLost()) { fallback(); return { update, dispose }; }
    renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true, premultipliedAlpha: true });
    renderer.setClearColor(0x000000, 0);
    canvas.addEventListener('webglcontextlost', lost);
    update(initial);
    if (!disposed) { canvas.style.visibility = 'visible'; initial.onMode('webgl2'); }
  } catch { fallback(); }
  return { update, dispose };
}
