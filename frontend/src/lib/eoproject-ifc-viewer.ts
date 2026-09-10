/**
 * eoProject IFC viewer — Three.js + web-ifc (dynamic imports).
 */

import { mustLog } from "./dev-log";

/** Keep in sync with installed `web-ifc` (package.json). */
const WEB_IFC_VERSION = "0.0.77";
const WEB_IFC_WASM_PATH = `https://unpkg.com/web-ifc@${WEB_IFC_VERSION}/`;

export type EoprojectIfcViewer = {
  loadFromUrl: (url: string, opts?: { credentials?: RequestCredentials }) => Promise<void>;
  dispose: () => void;
  resize: () => void;
};

type MaterialCache = Map<string, import("three").MeshLambertMaterial>;

export async function createEoprojectIfcViewer(
  container: HTMLElement,
): Promise<EoprojectIfcViewer> {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
  const { IfcAPI } = await import("web-ifc");

  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight || Math.round(width * 0.6));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8cc7de);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
  camera.position.set(12, 8, 12);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  container.replaceChildren(renderer.domElement);
  renderer.domElement.style.display = "block";

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);
  controls.update();

  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(12, 24, 8);
  scene.add(ambient, dir);

  const ifcAPI = new IfcAPI();
  ifcAPI.SetWasmPath(WEB_IFC_WASM_PATH, true);
  await ifcAPI.Init();

  let modelRoot: import("three").Group | null = null;
  let modelID: number | null = null;
  let raf = 0;
  let disposed = false;
  const materialCache: MaterialCache = new Map();

  const tick = () => {
    if (disposed) return;
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  tick();

  function clearModel() {
    if (modelRoot) {
      scene.remove(modelRoot);
      modelRoot.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
      modelRoot = null;
    }
    for (const mat of materialCache.values()) mat.dispose();
    materialCache.clear();
    if (modelID != null) {
      try {
        ifcAPI.CloseModel(modelID);
      } catch {
        /* ignore */
      }
      modelID = null;
    }
  }

  function getMaterial(color: { x: number; y: number; z: number; w: number }) {
    const key = `${color.x},${color.y},${color.z},${color.w}`;
    let mat = materialCache.get(key);
    if (mat) return mat;
    mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(color.x, color.y, color.z),
      transparent: color.w < 1,
      opacity: color.w,
      side: THREE.DoubleSide,
    });
    materialCache.set(key, mat);
    return mat;
  }

  function placedToMesh(
    placed: {
      color: { x: number; y: number; z: number; w: number };
      geometryExpressID: number;
      flatTransformation: number[];
    },
    mid: number,
  ): import("three").Mesh | null {
    const geometry = ifcAPI.GetGeometry(mid, placed.geometryExpressID);
    const verts = ifcAPI.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
    const indices = ifcAPI.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
    geometry.delete();

    const vertexCount = verts.length / 6;
    if (vertexCount === 0) return null;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    for (let v = 0; v < vertexCount; v++) {
      const src = v * 6;
      const dst = v * 3;
      positions[dst] = verts[src];
      positions[dst + 1] = verts[src + 1];
      positions[dst + 2] = verts[src + 2];
      normals[dst] = verts[src + 3];
      normals[dst + 1] = verts[src + 4];
      normals[dst + 2] = verts[src + 5];
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    buffer.setIndex(new THREE.BufferAttribute(indices, 1));

    const mesh = new THREE.Mesh(buffer, getMaterial(placed.color));
    const matrix = new THREE.Matrix4().fromArray(placed.flatTransformation);
    mesh.applyMatrix4(matrix);
    return mesh;
  }

  function fitCamera(root: import("three").Object3D) {
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const dist = maxDim * 1.6;
    camera.near = Math.max(dist / 1000, 0.01);
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
    camera.position.set(center.x + dist, center.y + dist * 0.65, center.z + dist);
    controls.target.copy(center);
    controls.update();
  }

  function resize() {
    if (disposed) return;
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight || Math.round(w * 0.6));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  async function loadFromUrl(url: string, opts?: { credentials?: RequestCredentials }) {
    if (disposed) return;
    if (mustLog) console.log("[eoproject-ifc] load", { url });
    clearModel();

    const credentials = opts?.credentials ?? "include";
    const res = await fetch(url, { credentials, headers: { Accept: "application/octet-stream,*/*" } });
    if (!res.ok) {
      throw new Error(`IFC fetch failed (${res.status}).`);
    }
    const buffer = new Uint8Array(await res.arrayBuffer());
    const mid = ifcAPI.OpenModel(buffer, { COORDINATE_TO_ORIGIN: true });
    if (mid < 0) {
      throw new Error("Could not open IFC model.");
    }
    modelID = mid;
    const root = new THREE.Group();
    ifcAPI.StreamAllMeshes(mid, (flatMesh) => {
      const placed = flatMesh.geometries;
      const size = placed.size();
      for (let i = 0; i < size; i++) {
        const mesh = placedToMesh(placed.get(i), mid);
        if (mesh) root.add(mesh);
      }
      flatMesh.delete();
    });
    modelRoot = root;
    scene.add(root);
    fitCamera(root);
    resize();
    if (mustLog) console.log("[eoproject-ifc] loaded", { modelID: mid, children: root.children.length });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    clearModel();
    try {
      ifcAPI.Dispose();
    } catch {
      /* ignore */
    }
    controls.dispose();
    renderer.dispose();
    container.replaceChildren();
  }

  return { loadFromUrl, dispose, resize };
}
