import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { playSfx } from '../lib/sfx';
import type { RoomVariant } from './RoomScene';

const lerp = THREE.MathUtils.lerp;

// Nạp & cache model glTF (dùng lại giữa các lần dựng phòng). Trả bản CLONE để đặt nhiều nơi.
const gltfLoader = new GLTFLoader();
const modelCache = new Map<string, Promise<THREE.Group>>();
function loadModel(name: string): Promise<THREE.Group> {
  let base = modelCache.get(name);
  if (!base) {
    base = new Promise<THREE.Group>((res, rej) => gltfLoader.load(`${import.meta.env.BASE_URL}models/${name}.glb`, (g) => res(g.scene as unknown as THREE.Group), undefined, rej));
    modelCache.set(name, base);
  }
  return base.then((s) => {
    const inner = s.clone(true);
    inner.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
    // Chuẩn hoá: đưa đáy về y=0, tâm x/z về 0, và ghi baseScale để maxDim → 1 (đặt kích thước thật khi place).
    const bbox = new THREE.Box3().setFromObject(inner);
    const size = new THREE.Vector3(); bbox.getSize(size);
    const center = new THREE.Vector3(); bbox.getCenter(center);
    inner.position.set(-center.x, -bbox.min.y, -center.z);
    const g = new THREE.Group(); g.add(inner);
    g.userData.baseScale = 1 / (Math.max(size.x, size.y, size.z) || 1);
    return g;
  });
}

/* Bảng màu nội thất theo Hồi (act). */
const P3: Record<1 | 2 | 3, {
  wall: string; wallTop: string; floor: string; floorLine: string; ceiling: number; rug: number; rugRim: number;
  amb: number; hemi: number; lamp: number; bg: number; leaf: number[]; wood: number;
}> = {
  1: { wall: '#EAD3C6', wallTop: '#F6E7DE', floor: '#D8B084', floorLine: '#B07C4E', ceiling: 0xFBF1EA, rug: 0xE6B6C1, rugRim: 0xCf98a6, amb: 0xFFEAD8, hemi: 0xFFF3E4, lamp: 0xFFC873, bg: 0xF3E1D6, leaf: [0x5AA867, 0x74BC7C, 0x468C54], wood: 0xB98A5E },
  2: { wall: '#A7BCA1', wallTop: '#C2D2BC', floor: '#C0946A', floorLine: '#835833', ceiling: 0xCBDAC6, rug: 0xE0BE93, rugRim: 0xC29a6b, amb: 0xF0DCBB, hemi: 0xF3DEBB, lamp: 0xFFB25A, bg: 0x3B3160, leaf: [0x5FA870, 0x7CBE86, 0x4C8C5C], wood: 0xA9784E },
  3: { wall: '#CBDBE8', wallTop: '#E6EFF6', floor: '#C6AE91', floorLine: '#9C8168', ceiling: 0xEAF1F8, rug: 0xC7E1EE, rugRim: 0xA9c7d6, amb: 0xE1ECF6, hemi: 0xEDF4FC, lamp: 0xFFE1A0, bg: 0xE6EFF6, leaf: [0x6FB6A0, 0x8CCBB6, 0x59A088], wood: 0xB49a7e },
};

/* ===== Thời tiết / thời điểm (mood) — được nội suy MƯỢT khi đổi ===== */
export type Weather = 'day' | 'cloudy' | 'sunset' | 'rain' | 'snow' | 'fog' | 'night';
interface MoodP {
  exposure: number; ambI: number; ambTint: number; ambMix: number;
  sunI: number; sunColor: number; sunPos: [number, number, number];
  envI: number; bgMul: number; bloom: number; lamp: number; hemiMul: number;
  glass: number; rainW: number; snowW: number; fogNear: number; fogFar: number;
}
const MOOD: Record<Weather, MoodP> = {
  day:    { exposure: 1.02, ambI: 0.6,  ambTint: 0xFFFFFF, ambMix: 0.0,  sunI: 1.3,  sunColor: 0xFFF0D8, sunPos: [-5, 7, 4],     envI: 0.4,  bgMul: 1.0,  bloom: 0.12, lamp: 3.0, hemiMul: 1.0,  glass: 0x9a9a9a, rainW: 0, snowW: 0, fogNear: 12, fogFar: 24 },
  cloudy: { exposure: 0.96, ambI: 0.66, ambTint: 0xAAB4BE, ambMix: 0.32, sunI: 0.5,  sunColor: 0xE6ECF0, sunPos: [-4, 7.5, 4],   envI: 0.44, bgMul: 0.9,  bloom: 0.08, lamp: 4.6, hemiMul: 0.9,  glass: 0x8c94a0, rainW: 0, snowW: 0, fogNear: 11, fogFar: 22 },
  sunset: { exposure: 1.0,  ambI: 0.52, ambTint: 0xE68A4A, ambMix: 0.4,  sunI: 1.15, sunColor: 0xFF9048, sunPos: [-6.5, 3.4, 4], envI: 0.32, bgMul: 0.82, bloom: 0.26, lamp: 6.4, hemiMul: 0.8,  glass: 0xC98A5A, rainW: 0, snowW: 0, fogNear: 11, fogFar: 22 },
  rain:   { exposure: 0.9,  ambI: 0.58, ambTint: 0x5E6E7E, ambMix: 0.46, sunI: 0.22, sunColor: 0xBFCAD6, sunPos: [-3, 6, 4],     envI: 0.34, bgMul: 0.7,  bloom: 0.09, lamp: 6.8, hemiMul: 0.72, glass: 0x6E7A88, rainW: 1, snowW: 0, fogNear: 9,  fogFar: 20 },
  snow:   { exposure: 1.04, ambI: 0.72, ambTint: 0xD6E2EE, ambMix: 0.4,  sunI: 0.5,  sunColor: 0xE8F0F8, sunPos: [-4, 6, 4],     envI: 0.42, bgMul: 0.92, bloom: 0.16, lamp: 5.5, hemiMul: 0.85, glass: 0xAEBECB, rainW: 0, snowW: 1, fogNear: 8,  fogFar: 19 },
  fog:    { exposure: 0.95, ambI: 0.64, ambTint: 0xB6BCC2, ambMix: 0.5,  sunI: 0.35, sunColor: 0xCED4DA, sunPos: [-4, 6.5, 4],   envI: 0.36, bgMul: 0.86, bloom: 0.1,  lamp: 5.6, hemiMul: 0.8,  glass: 0xB8BEC4, rainW: 0, snowW: 0, fogNear: 3.5, fogFar: 13 },
  night:  { exposure: 0.82, ambI: 0.4,  ambTint: 0x38386A, ambMix: 0.62, sunI: 0.16, sunColor: 0x8FA0D6, sunPos: [-3, 4, 4],     envI: 0.2,  bgMul: 0.48, bloom: 0.4,  lamp: 9.4, hemiMul: 0.6,  glass: 0x2E3A5C, rainW: 0, snowW: 0, fogNear: 12, fogFar: 24 },
};
/** Không truyền weather → tự chọn theo GIỜ THẬT (sáng/chiều/tối). */
function autoWeather(): Weather {
  const h = new Date().getHours();
  if (h >= 5 && h < 16) return 'day';
  if (h >= 16 && h < 19) return 'sunset';
  return 'night';
}

function woodTexture(base: string, line: string): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = line; g.globalAlpha = 0.35; g.lineWidth = 3;
  for (let y = 0; y < 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.globalAlpha = 0.08; g.lineWidth = 1;
  for (let i = 0; i < 200; i++) { g.beginPath(); const x = Math.random() * 512, y = Math.random() * 512, l = 20 + Math.random() * 60; g.moveTo(x, y); g.bezierCurveTo(x + l * 0.3, y + 2, x + l * 0.6, y - 2, x + l, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function wallTexture(bot: string, top: string): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256;
  const g = c.getContext('2d')!; const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top); grd.addColorStop(1, bot); g.fillStyle = grd; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function gradTexture(top: string, bot: string): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d')!; const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top); grd.addColorStop(1, bot); g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function blobShadow(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d')!; const grd = g.createRadialGradient(64, 64, 4, 64, 64, 60);
  grd.addColorStop(0, 'rgba(40,26,20,0.42)'); grd.addColorStop(1, 'rgba(40,26,20,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function softDot(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const g = c.getContext('2d')!; const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
/** Cảnh NGOÀI TRỜI qua cửa sổ theo thời tiết — CHỈ gradient mượt + 1 đĩa sáng lớn mềm (mặt trời/trăng).
 *  Không vẽ chấm/vệt li ti để tránh aliasing/nhiễu khi thu nhỏ → luôn SẮC NÉT. */
function skyTexture(w: Weather): THREE.Texture {
  const S = 256;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d')!;
  const grad = (top: string, bot: string) => { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
  // Đĩa sáng LỚN, tán mềm — tần số thấp nên thu nhỏ vẫn mịn, không nhiễu.
  const disc = (x: number, y: number, r: number, core: string, halo: string) => {
    const gr = g.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6); gr.addColorStop(0, halo); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    const gc = g.createRadialGradient(x, y, 0, x, y, r); gc.addColorStop(0, core); gc.addColorStop(0.75, core); gc.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gc; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  };
  switch (w) {
    case 'day': grad('#3E92D6', '#A6D8EA'); disc(190, 62, 26, '#FFF7D2', 'rgba(255,232,150,0.5)'); break;
    case 'cloudy': grad('#8C9AA8', '#C4CED8'); break;
    case 'sunset': grad('#F4A552', '#E27C93'); disc(120, 150, 30, '#FFEEC2', 'rgba(255,180,120,0.55)'); break;
    case 'rain': grad('#5C6975', '#93A0AC'); break;
    case 'snow': grad('#9DB2C4', '#DCE7EF'); break;
    case 'fog': grad('#AEB6BE', '#CDD3D9'); break;
    case 'night': grad('#0A1030', '#243056'); disc(190, 58, 22, '#F6F3E0', 'rgba(235,235,205,0.28)'); break;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function fabricBump(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d')!; g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128);
  const im = g.getImageData(0, 0, 128, 128);
  for (let i = 0; i < im.data.length; i += 4) { const n = 128 + (Math.random() - 0.5) * 60; im.data[i] = im.data[i + 1] = im.data[i + 2] = n; }
  g.putImageData(im, 0, 0);
  g.globalAlpha = 0.15; g.strokeStyle = '#fff';
  for (let x = 0; x < 128; x += 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}

/** Bối cảnh phòng 3D — dựng MỘT LẦN, mood (ngày/đêm/thời tiết) đổi MƯỢT bằng nội suy trong vòng lặp. */
export function RoomScene3D({ act = 1, variant = 'living', weather }: { act?: 1 | 2 | 3; variant?: RoomVariant; weather?: Weather }) {
  const host = useRef<HTMLDivElement>(null);
  const weatherRef = useRef<Weather>(weather ?? autoWeather());
  useEffect(() => { weatherRef.current = weather ?? autoWeather(); }, [weather]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const p = P3[act];
    const garden = variant === 'garden';
    let raf = 0; let disposed = false;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm');

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    el.appendChild(renderer.domElement);

    const mood: Weather = weatherRef.current;
    const M0 = MOOD[mood];
    const ambColor = (M: MoodP) => new THREE.Color(p.amb).lerp(new THREE.Color(M.ambTint), M.ambMix);
    const bgColorOf = (M: MoodP) => new THREE.Color(p.bg).multiplyScalar(M.bgMul);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = M0.envI;
    renderer.toneMappingExposure = M0.exposure;

    const bg = bgColorOf(M0); scene.background = bg;
    const fog = new THREE.Fog(bg.clone(), M0.fogNear, M0.fogFar); scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 2.1, 6.9); camera.lookAt(0, 1.5, -0.4);

    const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
    const track = <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(x: T): T => { disposables.push(x); return x; };
    const mat = (color: number, rough = 0.85, metal = 0) => track(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
    const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true, parent: THREE.Object3D = scene) => {
      const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), m);
      mesh.position.set(x, y, z); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const cyl = (rt: number, rb: number, h: number, seg: number, m: THREE.Material, x = 0, y = 0, z = 0, shadow = true, parent: THREE.Object3D = scene) => {
      const mesh = new THREE.Mesh(track(new THREE.CylinderGeometry(rt, rb, h, seg)), m);
      mesh.position.set(x, y, z); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    // Nạp model nội thất glTF (Kenney Furniture Kit, CC0) — chi tiết thật hơn khối 3D thô.
    const placed: THREE.Object3D[] = [];
    // size = KÍCH THƯỚC THẬT (cạnh lớn nhất, mét). ry = xoay. color = phủ MỘT màu để nội thất tương phản/hiện đại.
    const place = (name: string, x: number, y: number, z: number, size = 1, ry = 0, color?: number, onReady?: (o: THREE.Object3D) => void) => {
      loadModel(name).then((m) => {
        if (disposed) return;
        if (color !== undefined) {
          const cm = track(new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.02 }));
          m.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) mesh.material = cm; });
        }
        m.scale.setScalar(size * ((m.userData.baseScale as number) || 1));
        m.position.set(x, y, z); m.rotation.y = ry;
        scene.add(m); placed.push(m); onReady?.(m);
      }).catch(() => { /* thiếu model → bỏ qua, phòng vẫn chạy */ });
    };
    const shadowTex = track(blobShadow());
    const shadowMat = track(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    const contact = (x: number, z: number, r: number, parent: THREE.Object3D = scene) => {
      const m = new THREE.Mesh(track(new THREE.PlaneGeometry(r, r)), shadowMat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); parent.add(m); return m;
    };

    // ===== Ánh sáng (giữ tham chiếu để nội suy) =====
    const ambient = new THREE.AmbientLight(ambColor(M0), M0.ambI); scene.add(ambient);
    const baseHemi = garden ? 0.85 : 0.55;
    const hemi = new THREE.HemisphereLight(p.hemi, 0x5a4436, baseHemi * M0.hemiMul); scene.add(hemi);
    const sun = new THREE.DirectionalLight(M0.sunColor, M0.sunI);
    sun.position.set(M0.sunPos[0], M0.sunPos[1], M0.sunPos[2]);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); // 1024 đủ đẹp, dựng cảnh nhanh hơn
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 26;
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8; sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -6;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.018; sun.shadow.radius = 3.2; scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3 * M0.hemiMul); fill.position.set(5, 3.5, 5); scene.add(fill);

    // ===== Sàn =====
    const floorMat = track(new THREE.MeshStandardMaterial({ map: track(woodTexture(p.floor, p.floorLine)), roughness: 0.85 }));
    const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(18, 16)), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    if (!garden) {
      const wallMat = track(new THREE.MeshStandardMaterial({ map: track(wallTexture(p.wall, p.wallTop)), roughness: 0.98 }));
      const back = new THREE.Mesh(track(new THREE.PlaneGeometry(18, 9)), wallMat); back.position.set(0, 4.5, -3); back.receiveShadow = true; scene.add(back);
      const left = new THREE.Mesh(track(new THREE.PlaneGeometry(16, 9)), wallMat); left.rotation.y = Math.PI / 2; left.position.set(-7, 4.5, 0); left.receiveShadow = true; scene.add(left);
      const right = new THREE.Mesh(track(new THREE.PlaneGeometry(16, 9)), wallMat); right.rotation.y = -Math.PI / 2; right.position.set(7, 4.5, 0); right.receiveShadow = true; scene.add(right);
      const ceil = new THREE.Mesh(track(new THREE.PlaneGeometry(18, 16)), mat(p.ceiling, 1)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 9, 0); scene.add(ceil);
      const trimMat = mat(0xF3E9DF, 0.9);
      box(18, 0.34, 0.16, trimMat, 0, 0.17, -2.92, false);
      box(0.16, 0.34, 16, trimMat, -6.92, 0.17, 0, false);
      box(0.16, 0.34, 16, trimMat, 6.92, 0.17, 0, false);
      box(18, 0.28, 0.2, trimMat, 0, 8.86, -2.9, false);
    }

    cyl(2.35, 2.35, 0.04, 56, mat(p.rugRim, 1), 0, 0.02, 1.1, false).receiveShadow = true;
    cyl(2.05, 2.05, 0.06, 56, mat(p.rug, 1), 0, 0.035, 1.1, false).receiveShadow = true;

    // ===== Cửa sổ + RÈM VẢI. Kính dùng chung một material để nội suy màu theo mood. =====
    const clothBump = track(fabricBump());
    const curtainMat = track(new THREE.MeshStandardMaterial({ color: 0xEFE3D0, roughness: 0.95, bumpMap: clothBump, bumpScale: 0.006, side: THREE.DoubleSide }));
    // Bầu trời ngoài cửa sổ theo từng thời tiết (đổi NGAY khi bấm đổi thời tiết).
    const skyTexes = {} as Record<Weather, THREE.Texture>;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    (['day', 'cloudy', 'sunset', 'rain', 'snow', 'fog', 'night'] as Weather[]).forEach((w) => { const t = skyTexture(w); t.anisotropy = maxAniso; skyTexes[w] = track(t); });
    const glassMat = track(new THREE.MeshBasicMaterial({ map: skyTexes[mood], color: new THREE.Color(0xB2B2B2), toneMapped: false })); // trời giữ màu thật (texture sạch nên không cháy)
    const cloth: THREE.Object3D[] = [];
    const window3D = (x: number, z: number, ry = 0) => {
      const g = new THREE.Group(); g.position.set(x, 3.1, z); g.rotation.y = ry;
      const frame = mat(0xF3ECE2, 0.6);
      box(2.7, 2.5, 0.16, frame, 0, 0, 0.02, true, g);
      const glass = new THREE.Mesh(track(new THREE.PlaneGeometry(2.3, 2.1)), glassMat);
      glass.position.set(0, 0, 0.14); g.add(glass); // ra TRƯỚC mặt khung (0.10) để hết z-fighting
      box(0.09, 2.1, 0.14, frame, 0, 0, 0.17, false, g); box(2.3, 0.09, 0.14, frame, 0, 0, 0.17, false, g);
      box(2.95, 0.22, 0.4, mat(0xEAE0D4, 0.7), 0, -1.35, 0.12, true, g);
      cyl(0.05, 0.05, 3.3, 12, mat(0x9C6B4A, 0.5, 0.3), 0, 1.42, 0.24, false, g).rotation.z = Math.PI / 2;
      box(3.2, 0.34, 0.14, curtainMat, 0, 1.24, 0.26, true, g); // lá màn trên
      // Hai rèm buông hai BÊN (không che kính) — hộp phẳng, không nếp gấp gây nhiễu
      const drape = (px: number) => { const m = box(0.34, 2.5, 0.06, curtainMat, px, -0.15, 0.28, true, g); m.userData.ph = Math.random() * 6.28; cloth.push(m); };
      drape(-1.28); drape(1.28);
      scene.add(g); return g;
    };

    const swayers: THREE.Object3D[] = [];
    const plant = (x: number, z: number, s = 1) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const potMat = mat(0xCE7A50, 0.8);
      cyl(0.34 * s, 0.24 * s, 0.5 * s, 28, potMat, 0, 0.25 * s, 0, true, g);
      cyl(0.4 * s, 0.36 * s, 0.12 * s, 28, potMat, 0, 0.52 * s, 0, true, g);
      cyl(0.36 * s, 0.36 * s, 0.04 * s, 24, mat(0x4A342A, 1), 0, 0.55 * s, 0, false, g);
      const fol = new THREE.Group(); fol.position.y = 0.55 * s; g.add(fol);
      const blobs: [number, number, number, number, number][] = [
        [0, 0.55, 0, 0.5, 0], [-0.34, 0.4, 0.1, 0.34, 1], [0.36, 0.44, -0.06, 0.33, 1],
        [0.06, 0.92, 0.03, 0.42, 0], [-0.22, 0.76, -0.2, 0.3, 2], [0.26, 0.8, 0.2, 0.28, 2],
      ];
      for (const [bx, by, bz, br, ci] of blobs) {
        const leaf = new THREE.Mesh(track(new THREE.SphereGeometry(br * s, 18, 14)), mat(p.leaf[ci]!, 0.72));
        leaf.position.set(bx * s, by * s, bz * s); leaf.scale.y = 1.08; leaf.castShadow = true; fol.add(leaf);
      }
      fol.userData.ph = Math.random() * 6.28; swayers.push(fol);
      contact(x, z, 1.5 * s); scene.add(g); return g;
    };

    let lamp: THREE.PointLight | null = null;
    let lampModel: THREE.Object3D | null = null; // đèn bấm được (raycast) để bật/tắt
    let lampOn = true;
    const tableLamp = (x: number, z: number, withTable = true) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      if (withTable) { cyl(0.42, 0.46, 1.0, 20, mat(p.wood, 0.7), 0, 0.5, 0, true, g); cyl(0.5, 0.5, 0.08, 24, mat(0xD8B98F, 0.6), 0, 1.02, 0, true, g); }
      const baseY = withTable ? 1.06 : 0.02;
      cyl(0.12, 0.2, 0.08, 24, mat(0x8B5E3C, 0.5, 0.2), 0, baseY + 0.04, 0, true, g);
      cyl(0.035, 0.045, 0.85, 12, mat(0xC9A24B, 0.35, 0.7), 0, baseY + 0.5, 0, true, g);
      const shadeMat = track(new THREE.MeshStandardMaterial({ color: 0xFFE9BE, roughness: 0.5, emissive: p.lamp, emissiveIntensity: 0.75, side: THREE.DoubleSide }));
      cyl(0.32, 0.44, 0.42, 32, shadeMat, 0, baseY + 1.05, 0, true, g);
      const cap = new THREE.Mesh(track(new THREE.CircleGeometry(0.32, 32)), track(new THREE.MeshBasicMaterial({ color: 0xFFF3D6 })));
      cap.rotation.x = -Math.PI / 2; cap.position.y = baseY + 1.26; g.add(cap);
      const pl = new THREE.PointLight(p.lamp, 5.5, 7.5, 2); pl.position.set(0, baseY + 1.05, 0.1); g.add(pl);
      if (withTable) contact(x, z, 1.6);
      lampModel = g;
      scene.add(g); return pl;
    };

    const artFrame = (x: number, y: number, w: number, h: number, top: string, bot: string) => {
      box(w + 0.16, h + 0.16, 0.08, mat(0xE9C79E, 0.6), x, y, -2.94);
      const art = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ map: track(gradTexture(top, bot)) })));
      art.position.set(x, y, -2.89); scene.add(art);
    };

    // Tường ĐIỂM NHẤN (feature wall) — phủ màu đậm hơn để bật màu nội thất.
    const featureWall = (color: number, z = -2.99) => {
      const m = new THREE.Mesh(track(new THREE.PlaneGeometry(18, 9)), mat(color, 0.96));
      m.position.set(0, 4.5, z); m.receiveShadow = true; scene.add(m);
    };

    // Đèn THẢ TRẦN — dây + chao + bóng phát sáng + đèn điểm ấm.
    const pendant = (x: number, z: number, shadeColor = 0x30302F, shadeY = 5.3): THREE.PointLight => {
      cyl(0.015, 0.015, 9 - shadeY, 6, mat(0x26262A, 0.5), x, (9 + shadeY) / 2, z, false);
      const shade = new THREE.Mesh(track(new THREE.ConeGeometry(0.44, 0.5, 24, 1, true)), track(new THREE.MeshStandardMaterial({ color: shadeColor, roughness: 0.5, metalness: 0.35, side: THREE.DoubleSide, emissive: 0xFFE6B0, emissiveIntensity: 0.18 })));
      shade.position.set(x, shadeY, z); shade.castShadow = true; scene.add(shade);
      const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.13, 12, 10)), track(new THREE.MeshBasicMaterial({ color: 0xFFF3D0 })));
      bulb.position.set(x, shadeY - 0.16, z); scene.add(bulb);
      const light = new THREE.PointLight(0xFFE6B0, 3.2, 8, 2); light.position.set(x, shadeY - 0.25, z); scene.add(light);
      return light;
    };

    // Kệ TRANG TRÍ nổi trên tường (ván + cây nhỏ + sách + bình).
    const decoShelf = (x: number, y: number, w = 1.4, z = -2.78) => {
      box(w, 0.08, 0.34, mat(0xB78A5A, 0.6), x, y, z);
      cyl(0.1, 0.08, 0.16, 12, mat(0xCE7A50, 0.8), x - w * 0.3, y + 0.14, z, true);
      const leaf = new THREE.Mesh(track(new THREE.SphereGeometry(0.15, 12, 10)), mat(0x5FA870, 0.7)); leaf.position.set(x - w * 0.3, y + 0.33, z); leaf.scale.y = 1.2; leaf.castShadow = true; scene.add(leaf);
      box(0.26, 0.18, 0.24, mat(0xB23556, 0.6), x + w * 0.22, y + 0.13, z);
      box(0.22, 0.14, 0.24, mat(0x5B8A82, 0.6), x + w * 0.22 + 0.02, y + 0.29, z);
      cyl(0.06, 0.08, 0.24, 12, mat(0xE0A43B, 0.5), x + w * 0.02, y + 0.16, z, true);
    };

    // Cây LEO/RỦ treo — chậu cao + tán + vệt lá rủ xuống.
    const trailingPlant = (x: number, y: number, z: number) => {
      cyl(0.012, 0.012, 1.1, 6, mat(0x8A6A4A, 0.6), x, y + 0.55, z, false);
      cyl(0.17, 0.12, 0.22, 14, mat(0xC98D5E, 0.7), x, y, z, true);
      const bush = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 14, 10)), mat(0x5FA870, 0.72)); bush.position.set(x, y + 0.18, z); bush.castShadow = true; scene.add(bush);
      for (const dx of [-0.13, 0.02, 0.14]) {
        const len = 0.6 + Math.random() * 0.45;
        cyl(0.02, 0.008, len, 5, mat(0x63B06E, 0.7), x + dx, y - len / 2 + 0.05, z, false);
        const tip = new THREE.Mesh(track(new THREE.SphereGeometry(0.07, 8, 6)), mat(0x63B06E, 0.7)); tip.position.set(x + dx, y - len + 0.05, z); scene.add(tip);
      }
    };

    if (variant === 'living') {
      featureWall(0x59788A);                                   // TƯỜNG ĐIỂM NHẤN xanh xám → bật màu nội thất
      window3D(-2.3, -2.9);
      artFrame(1.4, 3.55, 1.15, 1.45, '#F6C9A0', '#E38FA8');   // tranh treo tường
      artFrame(2.85, 3.85, 0.7, 0.9, '#BFE3D6', '#7FB6C9');
      decoShelf(4.4, 4.2, 1.6);                                 // KỆ TRANG TRÍ nổi (cây nhỏ + sách + bình)
      decoShelf(4.55, 5.4, 1.25);
      trailingPlant(-6.4, 5.3, -2.2);                          // CÂY LEO/RỦ treo góc trái cao
      pendant(-2.7, -0.6);                                      // ĐÈN THẢ TRẦN trên bàn trà (ánh ấm)
      // Bố cục + bảng màu hiện đại: sofa xanh sage, ghế mustard, bàn gỗ, tủ trắng kem — tương phản, "có gu".
      place('rugRounded', -2.4, 0.03, -0.7, 3.4, 0, 0xB9A6C4);       // thảm tím nhạt định khu
      place('loungeSofa', -3.8, 0, -2.15, 3.2, Math.PI, 0x6E9C86);  // sofa xanh sage
      place('tableCoffee', -2.9, 0, -0.6, 1.5, 0, 0x9C6B4A);        // bàn trà gỗ óc chó
      place('sideTable', -5.7, 0, -2.0, 0.85, 0, 0x8A5E3C);         // bàn phụ gỗ
      place('cabinetTelevision', 0.6, 0, -2.7, 2.3, 0, 0xEDE6DA);   // tủ TV trắng kem
      place('bookcaseOpen', 5.1, 0, -2.65, 2.4, 0, 0xB78A5A);       // kệ sách gỗ ấm
      place('loungeChair', 3.1, 0, -0.1, 1.45, -0.7, 0xE0A43B);     // ghế bành mustard
      place('pottedPlant', -5.6, 0, -0.6, 1.55, 0);                 // cây (giữ màu gốc: lá xanh + chậu)
      place('lampRoundFloor', 5.3, 0, -1.0, 2.3, 0, 0xF3E7CE, (o) => { lampModel = o; }); // đèn cây kem (BẤM bật/tắt)
      const pl = new THREE.PointLight(p.lamp, 5.5, 7.5, 2); pl.position.set(5.3, 1.9, -1.0); scene.add(pl); lamp = pl;
      contact(-3.8, -2.15, 3.9); contact(3.1, -0.1, 1.9); contact(5.3, -1.0, 1.6); contact(-2.9, -0.6, 1.5);
    } else if (variant === 'kitchen') {
      window3D(2.5, -2.9);
      // Dãy bếp module hiện đại: tủ lạnh thép, tủ trắng, bếp đen, mặt bàn gỗ nhạt.
      place('kitchenFridge', -5.2, 0, -2.3, 2.6, 0, 0xC3CBD2);        // tủ lạnh inox
      place('kitchenCabinet', -3.5, 0, -2.5, 1.5, 0, 0xEDE6DA);      // tủ trắng kem
      place('kitchenSink', -2.0, 0, -2.5, 1.5, 0, 0xE4DDCF);
      place('kitchenStove', -0.5, 0, -2.5, 1.5, 0, 0x3B3B40);        // bếp đen
      place('kitchenCabinet', 1.0, 0, -2.5, 1.5, 0, 0xEDE6DA);
      place('kitchenCoffeeMachine', 3.0, 0.95, -2.4, 0.6, 0, 0xB23556);
      place('kitchenCabinetUpper', -3.5, 3.9, -2.7, 1.5, 0, 0xEDE6DA);
      place('kitchenCabinetUpper', -0.5, 3.9, -2.7, 1.5, 0, 0xEDE6DA);
      place('pottedPlant', 4.2, 0, -1.4, 1.4, 0);
      lamp = tableLamp(4.2, -1.2, false);
    } else {
      floorMat.map!.repeat.set(3, 3);
      const railMat = mat(0xD8A15E, 0.85);
      for (let x = -5; x <= 5; x += 0.7) box(0.14, 1.2, 0.14, railMat, x, 0.6, -2.6);
      box(11, 0.18, 0.24, mat(0xC98545, 0.85), 0, 1.25, -2.6);
      box(11, 0.18, 0.24, mat(0xB4835A, 0.85), 0, 0.1, -2.6, false);
      const hill = new THREE.Mesh(track(new THREE.SphereGeometry(6, 28, 18)), mat(0x7BBE6C, 1)); hill.position.set(-3, -3.4, -9); hill.scale.set(1.6, 0.5, 1); scene.add(hill);
      const hill2 = new THREE.Mesh(track(new THREE.SphereGeometry(6, 28, 18)), mat(0x9BD08A, 1)); hill2.position.set(4, -3.6, -11); hill2.scale.set(1.8, 0.5, 1); scene.add(hill2);
      const cloudMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
      const puffs: [number, number, number][] = [[0, 0, 0.9], [0.8, -0.1, 0.7], [-0.8, -0.1, 0.6], [0.3, 0.3, 0.6]];
      for (const [cx, cy, cz, cs] of [[-3.5, 4.2, -12, 1.1], [2.8, 5, -13, 1.4], [5, 3.6, -11, 0.8]] as const) {
        const cl = new THREE.Group(); cl.position.set(cx, cy, cz);
        for (const [dx, dy, r] of puffs) { const puff = new THREE.Mesh(track(new THREE.SphereGeometry(r * cs, 14, 10)), cloudMat); puff.position.set(dx * cs, dy * cs, 0); cl.add(puff); }
        scene.add(cl);
      }
      plant(-3.4, -1.1, 1.2); plant(3.4, -1.0, 1.0);
      cyl(0.07, 0.09, 1.0, 12, mat(0x9c6b4a, 0.6), 2.2, 0.5, -0.4);
      cyl(0.7, 0.7, 0.12, 28, mat(0xEAD9C2, 0.7), 2.2, 1.05, -0.4);
      contact(2.2, -0.4, 1.8);
      lamp = tableLamp(-3.0, -0.5, false);
    }

    // Bụi lơ lửng
    const dustGeo = track(new THREE.BufferGeometry());
    const ND = 60; const dpos = new Float32Array(ND * 3); const dvel = new Float32Array(ND);
    for (let i = 0; i < ND; i++) { dpos[i * 3] = (Math.random() - 0.5) * 13; dpos[i * 3 + 1] = Math.random() * 7; dpos[i * 3 + 2] = (Math.random() - 0.5) * 8; dvel[i] = 0.1 + Math.random() * 0.25; }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    scene.add(new THREE.Points(dustGeo, track(new THREE.PointsMaterial({ color: garden ? 0xffffff : 0xffe7b0, size: 0.05, transparent: true, opacity: 0.3, depthWrite: false }))));

    // Mưa & tuyết — luôn tạo, hiện/ẩn mượt bằng opacity theo mood.
    const RN = 220; const rpos = new Float32Array(RN * 6); const rvy = new Float32Array(RN);
    for (let i = 0; i < RN; i++) {
      const x = (Math.random() - 0.5) * 16, y = Math.random() * 9, z = (Math.random() - 0.5) * 6 + 1, len = 0.34 + Math.random() * 0.22;
      rpos[i * 6] = x; rpos[i * 6 + 1] = y; rpos[i * 6 + 2] = z; rpos[i * 6 + 3] = x + 0.03; rpos[i * 6 + 4] = y - len; rpos[i * 6 + 5] = z; rvy[i] = 0.16 + Math.random() * 0.12;
    }
    const rainGeo = track(new THREE.BufferGeometry()); rainGeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
    const rainMat = track(new THREE.LineBasicMaterial({ color: 0xcdd8e2, transparent: true, opacity: 0, depthWrite: false }));
    const rainObj = new THREE.LineSegments(rainGeo, rainMat); rainObj.visible = false; scene.add(rainObj);

    const SN = 300; const spos = new Float32Array(SN * 3); const svy = new Float32Array(SN); const sph = new Float32Array(SN);
    for (let i = 0; i < SN; i++) { spos[i * 3] = (Math.random() - 0.5) * 16; spos[i * 3 + 1] = Math.random() * 9; spos[i * 3 + 2] = (Math.random() - 0.5) * 7 + 1; svy[i] = 0.012 + Math.random() * 0.02; sph[i] = Math.random() * 6.28; }
    const snowGeo = track(new THREE.BufferGeometry()); snowGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
    const snowMat = track(new THREE.PointsMaterial({ map: track(softDot()), color: 0xffffff, size: 0.16, transparent: true, opacity: 0, depthWrite: false }));
    const snowObj = new THREE.Points(snowGeo, snowMat); snowObj.visible = false; scene.add(snowObj);

    // ===== Hậu kỳ =====
    let composer: EffectComposer | null = null;
    let bloom: UnrealBloomPass | null = null;
    if (!reduce) {
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      composer = new EffectComposer(renderer, rt);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), M0.bloom, 0.6, 0.86);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }

    const BASE_ASPECT = 1.4, BASE_Z = 6.9;
    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false); composer?.setSize(w, h); bloom?.setSize(w, h);
      const aspect = w / h; camera.aspect = aspect;
      camera.position.z = BASE_Z * Math.min(1.8, Math.max(1, BASE_ASPECT / aspect));
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(el);

    // ===== Bấm vào ĐÈN để bật/tắt như thật (raycast trên canvas) =====
    const raycaster = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const onCanvasClick = (e: MouseEvent) => {
      if (!lampModel) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ptr, camera);
      if (raycaster.intersectObject(lampModel, true).length > 0) { lampOn = !lampOn; playSfx('pop'); }
    };
    renderer.domElement.addEventListener('click', onCanvasClick);

    let lastWeather: Weather = mood; // để đổi bầu trời cửa sổ NGAY khi bấm

    // ===== Trạng thái mood hiện tại (được nội suy về target mỗi khung) =====
    const cur = {
      exposure: M0.exposure, ambI: M0.ambI, sunI: M0.sunI, envI: M0.envI, bloom: M0.bloom, lamp: M0.lamp, hemiMul: M0.hemiMul,
      rainW: M0.rainW, snowW: M0.snowW, fogNear: M0.fogNear, fogFar: M0.fogFar,
      amb: ambColor(M0), sun: new THREE.Color(M0.sunColor), bg: bgColorOf(M0),
      sunPos: new THREE.Vector3(...M0.sunPos),
    };
    const tmpAmb = new THREE.Color(), tmpSun = new THREE.Color(), tmpBg = new THREE.Color(), tmpPos = new THREE.Vector3();

    const applyMood = (k: number) => {
      const T = MOOD[weatherRef.current];
      cur.exposure = lerp(cur.exposure, T.exposure, k);
      cur.ambI = lerp(cur.ambI, T.ambI, k);
      cur.sunI = lerp(cur.sunI, T.sunI, k);
      cur.envI = lerp(cur.envI, T.envI, k);
      cur.bloom = lerp(cur.bloom, T.bloom, k);
      cur.lamp = lerp(cur.lamp, T.lamp, k);
      cur.hemiMul = lerp(cur.hemiMul, T.hemiMul, k);
      cur.rainW = lerp(cur.rainW, T.rainW, k);
      cur.snowW = lerp(cur.snowW, T.snowW, k);
      cur.fogNear = lerp(cur.fogNear, T.fogNear, k);
      cur.fogFar = lerp(cur.fogFar, T.fogFar, k);
      cur.amb.lerp(tmpAmb.copy(ambColor(T)), k);
      cur.sun.lerp(tmpSun.set(T.sunColor), k);
      cur.bg.lerp(tmpBg.copy(bgColorOf(T)), k);
      cur.sunPos.lerp(tmpPos.set(T.sunPos[0], T.sunPos[1], T.sunPos[2]), k);

      renderer.toneMappingExposure = cur.exposure;
      ambient.intensity = cur.ambI; ambient.color.copy(cur.amb);
      hemi.intensity = baseHemi * cur.hemiMul;
      sun.intensity = cur.sunI; sun.color.copy(cur.sun); sun.position.copy(cur.sunPos);
      fill.intensity = 0.3 * cur.hemiMul;
      scene.environmentIntensity = cur.envI;
      (scene.background as THREE.Color).copy(cur.bg); fog.color.copy(cur.bg); fog.near = cur.fogNear; fog.far = cur.fogFar;
      if (bloom) bloom.strength = cur.bloom;
      // Mưa/tuyết chỉ hiện NGOÀI TRỜI (ban công), rõ nét. Trong nhà chỉ thấy thời tiết qua cửa sổ.
      rainMat.opacity = cur.rainW * 0.75; rainObj.visible = garden && cur.rainW > 0.02;
      snowMat.opacity = cur.snowW; snowObj.visible = garden && cur.snowW > 0.02;
    };
    applyMood(1); // đặt đúng mood ban đầu ngay lập tức

    const render = () => { if (composer) composer.render(); else renderer.render(scene, camera); };
    const clock = new THREE.Clock();
    const loop = () => {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      const dt = Math.min(0.05, clock.getDelta());
      applyMood(1 - Math.pow(0.06, dt)); // fade ~1s, độc lập frame-rate
      // Bầu trời NGOÀI cửa sổ đổi NGAY khi đổi thời tiết (ánh sáng phòng thì fade mượt)
      if (weatherRef.current !== lastWeather) { lastWeather = weatherRef.current; glassMat.map = skyTexes[lastWeather]; glassMat.needsUpdate = true; }

      camera.position.x = Math.sin(t * 0.16) * 0.2; camera.position.y = 2.1 + Math.sin(t * 0.22) * 0.05; camera.lookAt(0, 1.5, -0.4);
      const a = dustGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < ND; i++) { let y = a.getY(i) + dvel[i]! * 0.01; if (y > 7) y = 0; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t + i) * 0.0006); }
      a.needsUpdate = true;
      for (const s of swayers) s.rotation.z = Math.sin(t * 0.7 + (s.userData.ph as number)) * 0.045;
      for (const c of cloth) c.rotation.y = Math.sin(t * 0.5 + (c.userData.ph as number)) * 0.03;
      if (rainObj.visible) {
        for (let i = 0; i < RN; i++) { const dy = rvy[i]!; rpos[i * 6 + 1] -= dy; rpos[i * 6 + 4] -= dy; if (rpos[i * 6 + 1] < 0) { const top = 9 + Math.random() * 2, len = rpos[i * 6 + 1] - rpos[i * 6 + 4]; rpos[i * 6 + 1] = top; rpos[i * 6 + 4] = top - len; } }
        rainGeo.attributes.position.needsUpdate = true;
      }
      if (snowObj.visible) {
        const sp = snowGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < SN; i++) { let y = sp.getY(i) - svy[i]!; if (y < 0) y = 9 + Math.random(); sp.setY(i, y); sp.setX(i, sp.getX(i) + Math.sin(t * 0.6 + sph[i]!) * 0.006); }
        sp.needsUpdate = true;
      }
      if (lamp) lamp.intensity = lampOn ? cur.lamp + Math.sin(t * 5) * 0.35 + Math.sin(t * 13) * 0.1 : 0;
      render();
    };
    if (reduce) render(); else loop();

    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      renderer.domElement.removeEventListener('click', onCanvasClick);
      for (const o of placed) scene.remove(o); // model dùng chung geometry ở cache → chỉ gỡ khỏi scene
      for (const d of disposables) d.dispose();
      composer?.dispose(); bloom?.dispose(); envRT.dispose(); pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [act, variant]);

  return <div ref={host} aria-hidden="true" className="absolute inset-0" />;
}
