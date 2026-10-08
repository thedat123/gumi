import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { playSfx } from '../lib/sfx';
import { getQuality } from '../lib/quality';
import type { RoomVariant } from './RoomScene';
import catGirlPearl from '../assets/cat-girl-pearl.webp';
import gumaWin from '../assets/gumayusi-win.webp'

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
  // Hồi 1 — kem ấm · gỗ nhạt · sage (pastel, nhã)
  1: { wall: '#E7DFD2', wallTop: '#F6F0E7', floor: '#C6A47C', floorLine: '#9E7A52', ceiling: 0xFBF5EE, rug: 0xE1D7C6, rugRim: 0xCBBAA3, amb: 0xFFEEDF, hemi: 0xFFF5EA, lamp: 0xFFCE86, bg: 0xF4E6DB, leaf: [0x6E9E79, 0x88B591, 0x557E62], wood: 0x8A6A47 },
  // Hồi 2 — greige xanh nhã · gỗ óc chó ấm
  2: { wall: '#BFCBB8', wallTop: '#D8E0D2', floor: '#C0A073', floorLine: '#8E6E48', ceiling: 0xD5E0CF, rug: 0xDCD1BF, rugRim: 0xC4B399, amb: 0xF2E2C6, hemi: 0xF4E4C6, lamp: 0xFFBE6A, bg: 0x3E3663, leaf: [0x6B9E78, 0x86B78E, 0x547E60], wood: 0x7C5A3C },
  // Hồi 3 — xanh bạc · marble sáng (lạnh nhã)
  3: { wall: '#D6E0E9', wallTop: '#EDF3F9', floor: '#CBB89A', floorLine: '#A48D72', ceiling: 0xEFF5FB, rug: 0xDBE3E9, rugRim: 0xBECDD8, amb: 0xE6EFF7, hemi: 0xEFF5FC, lamp: 0xFFE6AE, bg: 0xE9F1F8, leaf: [0x77B0A2, 0x93C6BA, 0x62998C], wood: 0x9A886F },
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
  day:    { exposure: 1.04, ambI: 0.84, ambTint: 0xFFFFFF, ambMix: 0.0,  sunI: 1.32, sunColor: 0xFFF3E0, sunPos: [-5, 7, 4],     envI: 0.52, bgMul: 1.04, bloom: 0.06, lamp: 2.8, hemiMul: 1.16, glass: 0x9a9a9a, rainW: 0, snowW: 0, fogNear: 13, fogFar: 26 },
  cloudy: { exposure: 0.97, ambI: 0.68, ambTint: 0xAAB4BE, ambMix: 0.32, sunI: 0.5,  sunColor: 0xE6ECF0, sunPos: [-4, 7.5, 4],   envI: 0.44, bgMul: 0.9,  bloom: 0.05, lamp: 3.8, hemiMul: 0.92, glass: 0x8c94a0, rainW: 0, snowW: 0, fogNear: 11, fogFar: 22 },
  sunset: { exposure: 0.99, ambI: 0.58, ambTint: 0xE68A4A, ambMix: 0.36, sunI: 1.05, sunColor: 0xFF9048, sunPos: [-6.5, 3.4, 4], envI: 0.32, bgMul: 0.82, bloom: 0.12, lamp: 4.6, hemiMul: 0.86, glass: 0xC98A5A, rainW: 0, snowW: 0, fogNear: 11, fogFar: 22 },
  rain:   { exposure: 0.92, ambI: 0.6,  ambTint: 0x5E6E7E, ambMix: 0.44, sunI: 0.22, sunColor: 0xBFCAD6, sunPos: [-3, 6, 4],     envI: 0.34, bgMul: 0.7,  bloom: 0.06, lamp: 5.0, hemiMul: 0.76, glass: 0x6E7A88, rainW: 1, snowW: 0, fogNear: 9,  fogFar: 20 },
  snow:   { exposure: 1.0,  ambI: 0.74, ambTint: 0xD6E2EE, ambMix: 0.38, sunI: 0.5,  sunColor: 0xE8F0F8, sunPos: [-4, 6, 4],     envI: 0.42, bgMul: 0.92, bloom: 0.09, lamp: 4.4, hemiMul: 0.88, glass: 0xAEBECB, rainW: 0, snowW: 1, fogNear: 8,  fogFar: 19 },
  fog:    { exposure: 0.95, ambI: 0.66, ambTint: 0xB6BCC2, ambMix: 0.48, sunI: 0.35, sunColor: 0xCED4DA, sunPos: [-4, 6.5, 4],   envI: 0.36, bgMul: 0.86, bloom: 0.07, lamp: 4.6, hemiMul: 0.82, glass: 0xB8BEC4, rainW: 0, snowW: 0, fogNear: 3.5, fogFar: 13 },
  night:  { exposure: 0.86, ambI: 0.48, ambTint: 0x38386A, ambMix: 0.58, sunI: 0.16, sunColor: 0x8FA0D6, sunPos: [-3, 4, 4],     envI: 0.22, bgMul: 0.5,  bloom: 0.18, lamp: 6.2, hemiMul: 0.64, glass: 0x2E3A5C, rainW: 0, snowW: 0, fogNear: 12, fogFar: 24 },
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
    case 'rain': grad('#5C6975', '#93A0AC'); break;   // mưa rơi = lớp phủ ĐỘNG riêng (precipTexture)
    case 'snow': grad('#9DB2C4', '#DCE7EF'); break;   // tuyết rơi = lớp phủ ĐỘNG riêng
    case 'fog': grad('#AEB6BE', '#CDD3D9'); break;
    case 'night': grad('#0A1030', '#243056'); disc(190, 58, 22, '#F6F3E0', 'rgba(235,235,205,0.28)'); break;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Màn hình TV "đang bật" — cảnh mèo Gumi ngồi ngắm hoàng hôn (kênh GUMI TV). Vẽ tay, độ nét cao. */
function tvScreenTexture(): THREE.Texture {
  const W = 768;
  const H = 432;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;

  const g = c.getContext('2d')!;

  // Texture trả về ngay
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;

  texture.anisotropy = 16;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Load JPG local
  const img = new Image();

  img.onload = () => {
    // object-fit: cover
    const scale = Math.max(
      W / img.naturalWidth,
      H / img.naturalHeight,
    );

    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;

    const x = (W - width) / 2;
    const y = (H - height) / 2;

    g.drawImage(img, x, y, width, height);

    // HUD của TV
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(0, H - 52, W, 52);

    g.fillStyle = 'rgba(255,255,255,0.96)';
    g.font = 'bold 30px system-ui, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';

    g.fillText('GUMI TV', 22, H - 26);

    g.fillStyle = '#FF6B81';
    g.beginPath();
    g.arc(W - 96, H - 26, 7, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = 'bold 22px system-ui, sans-serif';
    g.fillText('LIVE', W - 82, H - 25);

    // Quan trọng
    texture.needsUpdate = true;
  };

  img.src = gumaWin;

  return texture;
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


/** Đá MARBLE ĐẬM có vân — cho backsplash/mặt đá kiểu bếp nhà hàng 5 sao. */
function marbleTexture(base: string, vein: string, gold = '#B79A5A'): THREE.Texture {
  const S = 512; const c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, S, S); bg.addColorStop(0, base); bg.addColorStop(1, '#1A2024'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const vein_ = (col: string, n: number, w0: number, a: number) => {
    g.strokeStyle = col; g.globalAlpha = a; g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      let x = Math.random() * S, y = Math.random() * S; g.lineWidth = w0 * (0.4 + Math.random());
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 170; y += (Math.random() - 0.25) * 130; g.lineTo(x, y); }
      g.stroke();
    }
  };
  vein_(vein, 6, 4.5, 0.5); vein_(vein, 16, 1.4, 0.3); vein_(gold, 4, 1.8, 0.3);
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** Mặt tiền toà nhà buổi tối — ô cửa sổ sáng đèn ngẫu nhiên (skyline nhìn từ ban công). */
function cityTexture(): THREE.Texture {
  const S = 128; const c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d')!;
  g.fillStyle = '#232735'; g.fillRect(0, 0, S, S);
  const cols = 5, rows = 7, pad = 9, gap = 6;
  const ww = (S - pad * 2 - gap * (cols - 1)) / cols, wh = (S - pad * 2 - gap * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
    g.fillStyle = Math.random() < 0.5 ? (Math.random() < 0.72 ? '#FFE29A' : '#BFE0FF') : '#2C3446';
    g.fillRect(pad + cc * (ww + gap), pad + r * (wh + gap), ww, wh);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
}

/** Lớp mưa/tuyết TRONG SUỐT để phủ lên kính cửa sổ rồi CUỘN xuống → mưa/tuyết rơi chân thực nhìn qua cửa sổ. */
function precipTexture(kind: 'rain' | 'snow'): THREE.Texture {
  const S = 256; const c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S); // nền ĐEN → additive blending cộng 0 (vô hình); chỉ vệt sáng hiện
  if (kind === 'rain') {
    // Vệt MẢNH, nhiều hạt → hạt nhỏ & dày như mưa thật (repeat lớn hơn khiến mỗi hạt nhìn càng nhỏ).
    g.strokeStyle = 'rgba(220,236,255,0.85)'; g.lineWidth = 1.6; g.lineCap = 'round';
    for (let i = 0; i < 42; i++) { const x = Math.random() * S, y = Math.random() * S, len = 22 + Math.random() * 26; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + len); g.stroke(); }
  } else {
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (let i = 0; i < 48; i++) { const x = Math.random() * S, y = Math.random() * S, r = 1.1 + Math.random() * 1.7; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  // TẮT mipmap → vệt mưa/tuyết luôn SẮC, không bị mờ khi thu nhỏ trên cửa sổ nhỏ.
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  // repeat lớn → tiling dày, mỗi hạt nhìn nhỏ lại (mưa dày hơn tuyết).
  t.repeat.set(kind === 'rain' ? 2 : 2, kind === 'rain' ? 3 : 2.2);
  return t;
}

/* ===== TRANH NỔI TIẾNG — vẽ tay trên canvas (không cần tải ảnh, chạy offline). ===== */
/** Đưa ảnh/canvas về khổ POWER-OF-TWO 512×512 rồi tạo texture có mipmap → thu nhỏ MỊN, hết nhiễu/rung
 *  ở mọi máy (UV giữ tỉ lệ nên map lên khung đúng tỉ lệ vẫn KHÔNG méo). */
function potTexture(src: CanvasImageSource, aniso = 8): THREE.Texture {
  const pot = document.createElement('canvas'); pot.width = 512; pot.height = 512;
  pot.getContext('2d')!.drawImage(src, 0, 0, 512, 512);
  const t = new THREE.CanvasTexture(pot); t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = aniso;
  return t;
}
function texFromCanvas(c: HTMLCanvasElement): THREE.Texture { return potTexture(c); }
export type Painting = 'mona' | 'wave' | 'starry';
/** Trả canvas kèm tỉ lệ khung (w:h) để đặt khung tranh cho đúng dáng. */
function paintingTexture(kind: Painting): { tex: THREE.Texture; ratio: number } {
  if (kind === 'wave') {
    // Sóng lừng ngoài khơi Kanagawa — Hokusai
    const c = document.createElement('canvas'); c.width = 440; c.height = 300; const g = c.getContext('2d')!;
    const sky = g.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#EFE4C7'); sky.addColorStop(1, '#E4D3AF');
    g.fillStyle = sky; g.fillRect(0, 0, 440, 300);
    g.fillStyle = '#5C7592'; g.beginPath(); g.moveTo(262, 150); g.lineTo(322, 214); g.lineTo(202, 214); g.closePath(); g.fill(); // núi Phú Sĩ
    g.fillStyle = '#F4EFE4'; g.beginPath(); g.moveTo(262, 150); g.lineTo(284, 176); g.lineTo(272, 172); g.lineTo(262, 182); g.lineTo(252, 172); g.lineTo(240, 176); g.closePath(); g.fill();
    g.fillStyle = '#254E82'; g.beginPath(); g.moveTo(0, 214); g.bezierCurveTo(130, 182, 320, 248, 440, 206); g.lineTo(440, 300); g.lineTo(0, 300); g.closePath(); g.fill();
    g.fillStyle = '#12386A'; g.beginPath(); g.moveTo(0, 150); g.bezierCurveTo(70, 30, 170, 26, 208, 128); g.bezierCurveTo(224, 176, 158, 188, 150, 148); g.bezierCurveTo(146, 122, 176, 120, 180, 140); g.bezierCurveTo(128, 224, 44, 232, 0, 214); g.closePath(); g.fill();
    g.fillStyle = '#3C6BA6'; g.beginPath(); g.moveTo(12, 162); g.bezierCurveTo(64, 66, 152, 66, 186, 132); g.bezierCurveTo(132, 198, 54, 206, 12, 194); g.closePath(); g.fill();
    g.fillStyle = '#F6F1E5'; for (const [fx, fy, fr] of [[160, 58, 11], [182, 82, 9], [198, 110, 7], [128, 48, 10], [98, 54, 8], [70, 72, 7], [206, 138, 6]] as const) { g.beginPath(); g.arc(fx, fy, fr, 0, 7); g.fill(); }
    g.strokeStyle = '#38311F'; g.lineWidth = 3; g.beginPath(); g.moveTo(214, 236); g.quadraticCurveTo(248, 252, 288, 236); g.stroke();
    g.beginPath(); g.moveTo(300, 244); g.quadraticCurveTo(330, 258, 366, 244); g.stroke();
    return { tex: texFromCanvas(c), ratio: 440 / 300 };
  }
  if (kind === 'starry') {
    // Đêm đầy sao — Van Gogh
    const c = document.createElement('canvas'); c.width = 420; c.height = 320; const g = c.getContext('2d')!;
    const night = g.createLinearGradient(0, 0, 0, 320); night.addColorStop(0, '#12224E'); night.addColorStop(1, '#1E3164');
    g.fillStyle = night; g.fillRect(0, 0, 420, 320);
    g.lineWidth = 3; g.lineCap = 'round';
    const swirl = (cx: number, cy: number, r0: number, turns: number, col: string) => { g.strokeStyle = col; g.beginPath(); for (let a = 0; a < turns * 6.28; a += 0.3) { const r = r0 + a * 3.4; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.8; a === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); };
    swirl(150, 120, 6, 2.4, '#6E8AC8'); swirl(150, 120, 3, 2.0, '#AFC3E8'); swirl(270, 96, 5, 1.8, '#5A79B6');
    for (let i = 0; i < 9; i++) { const x = 20 + i * 46 + (i % 2) * 14, y = 40 + (i % 3) * 26; const gr = g.createRadialGradient(x, y, 0, x, y, 16); gr.addColorStop(0, '#FCE38A'); gr.addColorStop(0.4, 'rgba(250,220,120,0.6)'); gr.addColorStop(1, 'rgba(250,220,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); g.fillStyle = '#FFF4C2'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    const mg = g.createRadialGradient(360, 58, 4, 360, 58, 34); mg.addColorStop(0, '#FFEC9E'); mg.addColorStop(0.5, 'rgba(255,224,130,0.7)'); mg.addColorStop(1, 'rgba(255,224,130,0)'); g.fillStyle = mg; g.beginPath(); g.arc(360, 58, 34, 0, 7); g.fill(); // trăng
    g.fillStyle = '#0C1A16'; g.beginPath(); g.moveTo(56, 320); g.bezierCurveTo(20, 210, 60, 120, 46, 40); g.bezierCurveTo(92, 120, 96, 220, 92, 320); g.closePath(); g.fill(); // cây bách
    g.fillStyle = '#243A4A'; g.beginPath(); g.moveTo(0, 320); g.lineTo(0, 258); g.quadraticCurveTo(210, 232, 420, 262); g.lineTo(420, 320); g.closePath(); g.fill(); // đồi
    g.fillStyle = '#182A38'; for (const [hx, hw] of [[150, 40], [200, 30], [250, 46], [312, 34]] as const) { g.fillRect(hx, 272, hw, 30); g.beginPath(); g.moveTo(hx - 3, 272); g.lineTo(hx + hw / 2, 258); g.lineTo(hx + hw + 3, 272); g.closePath(); g.fill(); }
    g.fillStyle = '#20344a'; g.beginPath(); g.moveTo(268, 272); g.lineTo(276, 236); g.lineTo(284, 272); g.closePath(); g.fill(); // gác chuông
    g.fillStyle = '#FFD873'; for (const [wx, wy] of [[160, 284], [214, 286], [262, 284], [322, 286], [352, 288]] as const) g.fillRect(wx, wy, 5, 7);
    return { tex: texFromCanvas(c), ratio: 420 / 320 };
  }
  // Mona Lisa — Da Vinci
  const c = document.createElement('canvas'); c.width = 300; c.height = 400; const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, 400); bg.addColorStop(0, '#6C6440'); bg.addColorStop(0.5, '#4A4026'); bg.addColorStop(1, '#241B10');
  g.fillStyle = bg; g.fillRect(0, 0, 300, 400);
  g.fillStyle = 'rgba(120,140,120,0.5)'; g.fillRect(0, 120, 78, 70); g.fillStyle = 'rgba(150,165,150,0.45)'; g.fillRect(224, 96, 76, 66); // phong cảnh mờ hai bên
  g.strokeStyle = 'rgba(150,150,120,0.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(232, 150); g.quadraticCurveTo(268, 138, 300, 150); g.stroke();
  g.fillStyle = '#2A2116'; g.beginPath(); g.moveTo(150, 214); g.bezierCurveTo(40, 250, 10, 340, 20, 400); g.lineTo(280, 400); g.bezierCurveTo(290, 340, 260, 250, 150, 214); g.closePath(); g.fill(); // áo choàng
  g.fillStyle = '#241A11'; g.beginPath(); g.ellipse(150, 300, 92, 70, 0, Math.PI, 0, true); g.fill();
  g.fillStyle = '#E8C79E'; g.beginPath(); g.ellipse(150, 300, 30, 20, 0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(176, 306, 26, 17, 0.3, 0, 7); g.fill(); // đôi tay đan
  g.fillStyle = '#28211A'; g.beginPath(); g.ellipse(150, 150, 84, 96, 0, 0, 7); g.fill(); // tóc/khăn
  g.fillStyle = '#E6C199'; g.beginPath(); g.ellipse(150, 168, 46, 60, 0, 0, 7); g.fill(); // mặt
  g.fillStyle = '#DDB88C'; g.fillRect(126, 210, 48, 34); // cổ
  g.fillStyle = '#3A2E22'; g.beginPath(); g.ellipse(132, 160, 8, 4, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(168, 160, 8, 4, 0, 0, 7); g.fill(); // mắt
  g.fillStyle = '#241B12'; g.beginPath(); g.arc(132, 160, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(168, 160, 2.4, 0, 7); g.fill();
  g.strokeStyle = 'rgba(90,66,44,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(150, 162); g.quadraticCurveTo(156, 180, 149, 186); g.stroke(); // mũi
  g.beginPath(); g.moveTo(136, 198); g.quadraticCurveTo(150, 206, 164, 197); g.stroke(); // nụ cười
  g.fillStyle = 'rgba(210,150,110,0.25)'; g.beginPath(); g.arc(120, 182, 12, 0, 7); g.fill(); g.beginPath(); g.arc(180, 182, 12, 0, 7); g.fill();
  g.fillStyle = 'rgba(120,80,30,0.14)'; g.fillRect(0, 0, 300, 400); // lớp vecni ám vàng
  return { tex: texFromCanvas(c), ratio: 300 / 400 };
}
/** Biển tên đồng khắc chữ (kiểu bảo tàng) đặt dưới khung tranh. */
function plateTexture(text: string): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48; const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 48); gr.addColorStop(0, '#E9C877'); gr.addColorStop(0.5, '#B8912F'); gr.addColorStop(1, '#7C5E1C');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 48);
  g.fillStyle = 'rgba(60,40,10,0.9)'; g.font = 'bold 22px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 26);
  return texFromCanvas(c);
}

/* Ảnh tranh THẬT lấy trực tiếp trên mạng (Wikimedia Commons, có CORS). Special:FilePath tự trỏ tới file hiện hành. */
const PAINTING_URL: Record<Painting, string> = {
  mona: catGirlPearl,
  wave: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/640px-Tsunami_by_hokusai_19th_century.jpg',
  starry: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/640px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
};
const webPaintingCache = new Map<Painting, Promise<THREE.Texture>>(); // dùng lại giữa các lần dựng phòng; KHÔNG dispose (chỉ 3 ảnh)
function loadWebPainting(kind: Painting): Promise<THREE.Texture> {
  let p = webPaintingCache.get(kind);
  if (!p) {
    // Tải ảnh THẬT → vẽ vào canvas POWER-OF-TWO 512 → texture mipmap → thu nhỏ MỊN, hết nhiễu hoàn toàn.
    p = new Promise<THREE.Texture>((res, rej) => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => { try { res(potTexture(img, 16)); } catch (e) { rej(e); } };
      img.onerror = rej;
      img.src = PAINTING_URL[kind];
    });
    webPaintingCache.set(kind, p);
  }
  return p;
}

/** Bối cảnh phòng 3D — dựng MỘT LẦN, mood (ngày/đêm/thời tiết) đổi MƯỢT bằng nội suy trong vòng lặp. */
export function RoomScene3D({ act = 1, variant = 'living', weather, lights = true }: { act?: 1 | 2 | 3; variant?: RoomVariant; weather?: Weather; lights?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const weatherRef = useRef<Weather>(weather ?? autoWeather());
  useEffect(() => { weatherRef.current = weather ?? autoWeather(); }, [weather]);
  const lightsRef = useRef(lights);
  useEffect(() => { lightsRef.current = lights; }, [lights]);

  // Màn hẹp (điện thoại dọc) → cửa sổ hai bên bị khung hình cắt mất; dùng bố cục cửa sổ RIÊNG cho mobile.
  // Theo dõi bằng media-query để xoay ngang/dọc là dựng lại đúng bố cục.
  const [narrow, setNarrow] = useState(() => window.matchMedia?.('(max-width: 640px)').matches ?? ((window.innerWidth || 1024) <= 640));
  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 640px)');
    if (!mq) return;
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const p = P3[act];
    const garden = variant === 'garden';
    let raf = 0; let disposed = false;
    const q = getQuality();
    const reduce = q.reduce;

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: q.antialias, alpha: true, powerPreference: q.tier === 'low' ? 'low-power' : 'high-performance' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(q.pixelRatio, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = q.shadows;
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
    // Hemisphere MẠNH hơn = ánh sáng phủ ĐỀU khắp phòng (không đốm, không góc tối); ground color nhạt hơn để đáy phòng cũng sáng.
    const baseHemi = garden ? 0.9 : 1.15;
    const hemi = new THREE.HemisphereLight(p.hemi, 0x8a7a68, baseHemi * M0.hemiMul); scene.add(hemi);
    const sun = new THREE.DirectionalLight(M0.sunColor, M0.sunI);
    sun.position.set(M0.sunPos[0], M0.sunPos[1], M0.sunPos[2]);
    sun.castShadow = q.shadows; sun.shadow.mapSize.set(q.shadowMap, q.shadowMap); // hạ theo hạng máy (máy yếu tắt hẳn bóng)
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 26;
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8; sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -6;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.018; sun.shadow.radius = 5.5; scene.add(sun); // bóng mềm hơn → ít mảng tối gắt
    // Fill HAI BÊN (đối xứng) để giảm tương phản bóng đổ, ánh sáng đều cả hai phía.
    const fill = new THREE.DirectionalLight(0xffffff, 0.34 * M0.hemiMul); fill.position.set(5, 3.5, 6); scene.add(fill);
    const fillL = new THREE.DirectionalLight(0xffffff, 0.3 * M0.hemiMul); fillL.position.set(-5, 3.5, 6); scene.add(fillL);

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
    // Lớp MƯA/TUYẾT động phủ lên kính (dùng chung 1 material cho mọi cửa sổ; cuộn + đổi map trong vòng lặp).
    const rainFx = track(precipTexture('rain')), snowFx = track(precipTexture('snow'));
    const fxMat = track(new THREE.MeshBasicMaterial({ map: rainFx, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })); // nền đen cộng 0, vệt sáng hiện
    let fxKind: 'rain' | 'snow' | 'none' = 'none';
    const cloth: THREE.Object3D[] = [];
    const window3D = (x: number, z: number, ry = 0, y = 3.1, s = 1) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s);
      const frame = mat(0xF3ECE2, 0.6);
      box(2.7, 2.5, 0.16, frame, 0, 0, 0.02, true, g);
      const glass = new THREE.Mesh(track(new THREE.PlaneGeometry(2.3, 2.1)), glassMat);
      glass.position.set(0, 0, 0.14); g.add(glass); // ra TRƯỚC mặt khung (0.10) để hết z-fighting
      const fx = new THREE.Mesh(track(new THREE.PlaneGeometry(2.3, 2.1)), fxMat); fx.position.set(0, 0, 0.162); fx.renderOrder = 2; g.add(fx); // mưa/tuyết rơi trên kính (trước kính, sau nan cửa)
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
      const shadeMat = track(new THREE.MeshStandardMaterial({ color: 0xFFE9BE, roughness: 0.5, emissive: p.lamp, emissiveIntensity: 0.42, side: THREE.DoubleSide }));
      cyl(0.32, 0.44, 0.42, 32, shadeMat, 0, baseY + 1.05, 0, true, g);
      const cap = new THREE.Mesh(track(new THREE.CircleGeometry(0.32, 32)), track(new THREE.MeshBasicMaterial({ color: 0xFFF3D6 })));
      cap.rotation.x = -Math.PI / 2; cap.position.y = baseY + 1.26; g.add(cap);
      const pl = new THREE.PointLight(p.lamp, 5.5, 7.5, 2); pl.position.set(0, baseY + 1.05, 0.1); g.add(pl);
      if (withTable) contact(x, z, 1.6);
      lampModel = g;
      scene.add(g); return pl;
    };

    // Khung tranh treo tường. Truyền `art` = tên tranh nổi tiếng (Mona Lisa / Sóng / Đêm sao) hoặc gradient trơn.
    const artFrame = (x: number, y: number, w: number, h: number, opts: { art?: Painting; top?: string; bot?: string; gold?: boolean; plate?: string; light?: boolean } = {}) => {
      const frameCol = opts.gold ? 0xC9A24B : 0xE9C79E;
      // Tách RÕ độ sâu 3 lớp (khung sau → lớp lót → mặt tranh trước) để KHÔNG z-fighting (hết mảng trắng nhấp nháy).
      box(w + 0.22, h + 0.22, 0.1, mat(frameCol, 0.45, opts.gold ? 0.6 : 0.05), x, y, -2.96); // gờ khung (sâu nhất)
      box(w + 0.09, h + 0.09, 0.02, mat(0xF7F1E6, 0.9), x, y, -2.86);                          // passe-partout (mờ trắng)
      const tex = opts.art ? track(paintingTexture(opts.art).tex) : track(gradTexture(opts.top ?? '#F6C9A0', opts.bot ?? '#E38FA8'));
      // Tranh nổi tiếng: toneMapped=false để GIỮ MÀU THẬT, luôn rõ & nổi bật dù phòng sáng/tối.
      const artMat = track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: !opts.art }));
      const art = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), artMat);
      art.position.set(x, y, -2.8); scene.add(art);                                            // mặt tranh (trước nhất)
      // Nạp ẢNH THẬT trên mạng, thay vào khi tải xong (tranh vẽ tay là placeholder/fallback khi offline).
      if (opts.art) loadWebPainting(opts.art).then((webTex) => { if (!disposed) { artMat.map = webTex; artMat.needsUpdate = true; } }).catch(() => { /* giữ tranh vẽ tay */ });
      if (opts.plate) {
        box(0.62, 0.12, 0.03, mat(0xB8912F, 0.4, 0.7), x, y - h / 2 - 0.15, -2.84);
        const pl = new THREE.Mesh(track(new THREE.PlaneGeometry(0.58, 0.09)), track(new THREE.MeshBasicMaterial({ map: track(plateTexture(opts.plate)) })));
        pl.position.set(x, y - h / 2 - 0.15, -2.79); scene.add(pl);
      }
      if (opts.light) { // đèn rọi tranh (thanh vàng + ánh ấm) — làm tranh nổi bật & phòng sáng hơn
        box(w * 0.6, 0.05, 0.12, mat(0xC9A24B, 0.4, 0.6), x, y + h / 2 + 0.22, -2.66);
        cyl(0.02, 0.02, 0.16, 8, mat(0xC9A24B, 0.4, 0.6), x, y + h / 2 + 0.13, -2.62).rotation.x = Math.PI / 2;
        const l = new THREE.PointLight(0xFFF0CE, 1.7, 3.4, 2); l.position.set(x, y + h / 2 + 0.1, -2.3); scene.add(l);
      }
    };
    // Đồng hồ tường CHẠY THẬT (kim giờ/phút/giây theo giờ máy). Giữ refs để quay trong vòng lặp.
    let clock3D: { h: THREE.Object3D; m: THREE.Object3D; s: THREE.Object3D } | null = null;
    const wallClock = (x: number, y: number, r = 0.5) => {
      const g = new THREE.Group(); g.position.set(x, y, -2.86);
      cyl(r + 0.05, r + 0.05, 0.08, 36, mat(0x3A2E24, 0.5, 0.3), 0, 0, -0.04, false, g).rotation.x = Math.PI / 2; // vành
      cyl(r, r, 0.03, 36, mat(0xFBF4EA, 0.8), 0, 0, 0, false, g).rotation.x = Math.PI / 2;                       // mặt
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; box(0.02, i % 3 === 0 ? 0.09 : 0.05, 0.02, mat(0x4A3B2E, 0.6), Math.sin(a) * (r - 0.08), Math.cos(a) * (r - 0.08), 0.02, false, g); }
      const hH = box(0.035, r * 0.5, 0.02, mat(0x2A211A, 0.5), 0, 0, 0.04, false, g); hH.geometry.translate(0, r * 0.25, 0);
      const mH = box(0.025, r * 0.72, 0.02, mat(0x2A211A, 0.5), 0, 0, 0.05, false, g); mH.geometry.translate(0, r * 0.36, 0);
      const sH = box(0.012, r * 0.8, 0.02, mat(0xB3261E, 0.5), 0, 0, 0.06, false, g); sH.geometry.translate(0, r * 0.4, 0);
      cyl(0.03, 0.03, 0.03, 12, mat(0x2A211A, 0.4), 0, 0, 0.07, false, g).rotation.x = Math.PI / 2;
      scene.add(g); clock3D = { h: hH, m: mH, s: sH };
    };
    // Đèn tường (sconce) — bát đèn + ánh ấm hắt lên, tăng độ sáng và đối xứng sang trọng.
    const sconce = (x: number, y: number) => {
      box(0.1, 0.24, 0.08, mat(0xB8912F, 0.4, 0.6), x, y, -2.84);
      const cup = new THREE.Mesh(track(new THREE.SphereGeometry(0.13, 16, 8, 0, 6.28, 0, 1.7)), track(new THREE.MeshStandardMaterial({ color: 0xFFEAB8, roughness: 0.5, emissive: 0xFFD98A, emissiveIntensity: 0.45, side: THREE.DoubleSide })));
      cup.position.set(x, y + 0.14, -2.74); scene.add(cup);
      const l = new THREE.PointLight(0xFFE3AE, 2.1, 4.3, 2); l.position.set(x, y + 0.2, -2.4); scene.add(l);
    };
    // Đèn dây (fairy lights) vắt ngang đỉnh tường — bóng nhỏ phát sáng, ấm & lung linh.
    const fairyLights = (y = 8.1) => {
      for (let i = 0; i <= 16; i++) {
        const x = -8 + i * 1.0; const dy = y - Math.sin((i / 16) * Math.PI) * 0.5; // võng nhẹ
        const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.06, 8, 6)), track(new THREE.MeshBasicMaterial({ color: i % 2 ? 0xFFE7A6 : 0xFFF3D6 })));
        bulb.position.set(x, dy, -2.8); scene.add(bulb);
      }
      const l1 = new THREE.PointLight(0xFFE7B0, 0.85, 10, 2); l1.position.set(-3, 7.6, -1.5); scene.add(l1);
      const l2 = new THREE.PointLight(0xFFE7B0, 0.85, 10, 2); l2.position.set(3, 7.6, -1.5); scene.add(l2);
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
      const light = new THREE.PointLight(0xFFE6B0, 2.5, 8, 2); light.position.set(x, shadeY - 0.25, z); scene.add(light);
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

    // TV màn hình phẳng treo tường: viền đen mảnh + màn "đang bật" + đèn hắt ấm dịu (không chân đế).
    const flatTV = (x: number, y: number, z: number, w = 2.4) => {
      const h = w * 9 / 16;
      box(w + 0.1, h + 0.1, 0.07, mat(0x161616, 0.45, 0.4), x, y, z, true);            // viền mảnh
      const scr = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ map: track(tvScreenTexture()), toneMapped: false })));
      scr.position.set(x, y, z + 0.045); scene.add(scr);
      const glow = new THREE.PointLight(0xFFD9B0, 0.7, 6, 2); glow.position.set(x, y, z + 0.7); scene.add(glow);
    };

    if (variant === 'living') {
      featureWall(0xE4DBCC);                                    // tường greige ấm, phẳng sang trọng
      // Ánh sáng tổng dịu, CÂN ĐỐI hai bên (villa: đều, không đốm)
      const ceilGlow = new THREE.PointLight(0xFFF4E6, 1.35, 18, 2); ceilGlow.position.set(0, 7.4, 0.4); scene.add(ceilGlow);
      const ceilL = new THREE.PointLight(0xFFF1DC, 0.7, 15, 2); ceilL.position.set(-3.2, 7.0, -0.4); scene.add(ceilL);
      const ceilR = new THREE.PointLight(0xFFF1DC, 0.7, 15, 2); ceilR.position.set(3.2, 7.0, -0.4); scene.add(ceilR);
      fairyLights();                                            // đèn dây vắt ngang đỉnh tường
      // HAI cửa sổ đối xứng. Mobile (màn hẹp): kéo vào TRONG khung + nâng lên góc cao để không bị cắt & không đè tranh/đồng hồ.
      if (narrow) { window3D(-2.5, -2.9, 0, 5.5, 0.82); window3D(2.5, -2.9, 0, 5.5, 0.82); }
      else { window3D(-5.2, -2.9); window3D(5.2, -2.9); }

      // ===== TƯỜNG CHÍNH — TRANH bên TRÁI · ĐỒNG HỒ bên PHẢI → chừa GIỮA cho HUD/Gumi, KHÔNG bị che =====
      artFrame(-2.6, 3.05, 1.3, 1.65, { art: 'mona', gold: true, light: true }); // MONA LISA lệch TRÁI (bạn thích → giữ)
      wallClock(2.6, 3.15, 0.58);                              // ĐỒNG HỒ lệch PHẢI — lấy GIỜ HỆ THỐNG thật, chạy realtime
      sconce(-2.6, 4.25); sconce(2.6, 4.25);                   // đèn tường ôm tranh & đồng hồ (đối xứng)
      decoShelf(-5.6, 4.7, 1.1); decoShelf(5.6, 4.7, 1.1);    // kệ nổi đối xứng hai góc cao
      trailingPlant(-6.5, 5.2, -2.2); trailingPlant(6.5, 5.2, -2.2); // cây rủ đối xứng hai góc

      // ===== NỘI THẤT — bố cục ĐỐI XỨNG quanh trục giữa =====
      // Tủ TV áp tường chính giữa + cây bàn nhỏ đối xứng + 2 cây cảnh lớn hai bên
      place('cabinetTelevision', 0, 0, -2.75, 2.7, 0, 0x40342A);   // tủ TV gỗ óc chó ĐẬM — nổi bật trên tường sáng
      flatTV(0, 2.8, -2.7, 2.0);                                   // TV treo tường trên tủ, nhỏ & hạ thấp để không bị HUD che (kênh GUMI TV)
      place('plantSmall1', -1.05, 1.28, -2.62, 0.55, 0); place('plantSmall1', 1.05, 1.28, -2.62, 0.55, 0);
      place('pottedPlant', -4.0, 0, -2.5, 1.55, 0); place('pottedPlant', 4.0, 0, -2.5, 1.55, 0);
      // Thảm định khu CHÍNH GIỮA — dời RA SAU + to hơn để nằm ngay DƯỚI CHÂN Gumi (hết cảm giác bay)
      place('rugRounded', 0, 0.03, -1.3, 5.6, 0, 0xDED3C2);
      // HAI sofa ngà QUAY MẶT VÀO NHAU quanh bàn trà (cụm tiếp khách đối xứng)
      place('loungeSofa', -2.7, 0, -0.5, 3.0, Math.PI / 2, 0x46433F);   // sofa trái, hướng vào giữa
      place('loungeSofa', 2.7, 0, -0.5, 3.0, -Math.PI / 2, 0x46433F);   // sofa phải, hướng vào giữa
      // (BỎ bàn trà + sách giữa phòng → chừa thảm trống cho Gumi ĐỨNG TRÊN THẢM, không còn như đứng trên bàn)
      // Hai bàn phụ đối xứng ngoài hai đầu sofa
      place('sideTable', -4.5, 0, -1.5, 0.9, 0, 0x40342A); place('sideTable', 4.5, 0, -1.5, 0.9, 0, 0x40342A);
      // Hai đèn cây đối xứng phía sau hai đầu sofa (trái BẤM bật/tắt)
      place('lampRoundFloor', -4.4, 0, 0.5, 2.3, 0, 0xF3ECDD, (o) => { lampModel = o; });
      place('lampRoundFloor', 4.4, 0, 0.5, 2.3, 0, 0xF3ECDD);
      const plL = new THREE.PointLight(p.lamp, 3.0, 7.0, 2); plL.position.set(-4.4, 1.9, 0.5); scene.add(plL); lamp = plL;
      const plR = new THREE.PointLight(p.lamp, 3.0, 7.0, 2); plR.position.set(4.4, 1.9, 0.5); scene.add(plR);
      pendant(0, -0.5);                                         // đèn thả trần CHÍNH GIỮA trên bàn trà
      contact(-2.7, -0.5, 3.4); contact(2.7, -0.5, 3.4); contact(-4.0, -2.5, 1.7); contact(4.0, -2.5, 1.7); // (bỏ bóng sàn giữa của bàn trà cũ)
    } else if (variant === 'kitchen') {
      featureWall(0xEDE6D8);                                          // tường kem sang, phẳng
      // TẤM ĐÁ MARBLE ĐẬM liền sau bếp (feature slab từ mặt quầy lên hút mùi) — kiểu 5 sao, KHÔNG phủ hết tường
      const marbleTex = track(marbleTexture('#262D33', '#8C97A2')); marbleTex.repeat.set(1.4, 1.4);
      const splash = new THREE.Mesh(track(new THREE.PlaneGeometry(2.7, 2.75)), track(new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.24, metalness: 0.2 })));
      splash.position.set(0, 2.5, -2.87); splash.receiveShadow = true; scene.add(splash);
      // hai cửa sổ TRÊN QUẦY, ôm hai bên tấm đá & hút mùi. Mobile: kéo vào + nâng cao trên tấm đá để lọt khung hình hẹp.
      if (narrow) { window3D(-2.4, -2.9, 0, 5.0, 0.82); window3D(2.4, -2.9, 0, 5.0, 0.82); }
      else { window3D(-2.75, -2.9); window3D(2.75, -2.9); }

      // DÃY BẾP DƯỚI — căn đều 1.6m, BẾP + HÚT MÙI CHÍNH GIỮA, hai bên cân đối
      place('kitchenStove', 0, 0, -2.5, 1.55, 0, 0x2E2E33);          // bếp CHÍNH GIỮA (dưới hút mùi)
      place('kitchenCabinet', -1.6, 0, -2.5, 1.55, 0, 0x2F4539);
      place('kitchenSink', -3.2, 0, -2.5, 1.55, 0, 0x2F4539);      // xanh rêu đậm, tay nắm ẩn
      place('kitchenCabinet', -4.8, 0, -2.5, 1.55, 0, 0x2F4539);
      place('kitchenCabinet', 1.6, 0, -2.5, 1.55, 0, 0x2F4539);
      place('kitchenCabinet', 3.2, 0, -2.5, 1.55, 0, 0x2F4539);
      place('kitchenFridge', 5.0, 0, -2.35, 2.7, 0, 0xCED6DC);       // tủ lạnh inox đầu phải
      place('kitchenCoffeeMachine', 3.2, 0.98, -2.42, 0.55, 0, 0x8A8F96);
      place('plantSmall1', -1.6, 1.22, -2.5, 0.5, 0);                // cây nhỏ trên quầy (trái)

      // MÁY HÚT MÙI thép không gỉ kiểu CHIMNEY (nhà hàng 5 sao)
      box(1.7, 0.36, 0.82, mat(0xC7CDD2, 0.32, 0.75), 0, 3.32, -2.5);       // chụp hút hộp thép
      box(1.74, 0.06, 0.86, mat(0xADB3B9, 0.28, 0.85), 0, 3.12, -2.48);     // viền dưới sáng
      box(0.62, 1.15, 0.32, mat(0xC7CDD2, 0.32, 0.75), 0, 4.1, -2.6);       // ống khói lên trần

      // ===== BẾP GAS CHUYÊN NGHIỆP (5 sao) — mặt thép đen, 4 bếp + kiềng gang + núm thép =====
      const hobY = 1.02;
      box(1.48, 0.05, 0.68, mat(0x22222A, 0.3, 0.62), 0, hobY, -2.42);      // mặt bếp thép đen
      for (const bx of [-0.4, 0.4]) for (const bz of [-2.56, -2.28]) {
        cyl(0.12, 0.14, 0.025, 22, mat(0x18181B, 0.35, 0.5), bx, hobY + 0.03, bz);   // đế bếp gang
        cyl(0.075, 0.085, 0.03, 18, mat(0x45454A, 0.3, 0.7), bx, hobY + 0.055, bz);  // vành phun lửa
        box(0.32, 0.02, 0.028, mat(0x121214, 0.4, 0.4), bx, hobY + 0.085, bz);       // kiềng gang ngang
        box(0.028, 0.02, 0.32, mat(0x121214, 0.4, 0.4), bx, hobY + 0.085, bz);       // kiềng gang dọc
      }
      for (const kx of [-0.55, -0.19, 0.19, 0.55]) cyl(0.028, 0.028, 0.05, 14, mat(0xBEC2C7, 0.3, 0.78), kx, hobY + 0.015, -2.12); // núm vặn thép

      // LÒ NƯỚNG ÂM TỦ — mặt kính đen + tay nắm thép + bảng điều khiển (bên phải bếp)
      box(0.92, 0.52, 0.03, mat(0x141416, 0.12, 0.55), 1.6, 0.52, -2.16);   // cửa kính lò
      box(0.72, 0.05, 0.06, mat(0xBEC2C7, 0.3, 0.85), 1.6, 0.77, -2.11);    // tay nắm thép ngang
      box(0.44, 0.1, 0.02, mat(0x26262B, 0.3, 0.5), 1.6, 0.86, -2.13);      // bảng điều khiển

      // Tường trên TỐI GIẢN: cửa sổ ôm hai bên tấm đá + đồng hồ căn giữa (bỏ tủ trên → thoáng, sáng, 5 sao)
      wallClock(0, 5.05, 0.42);                                      // đồng hồ căn GIỮA trên hút mùi (giờ hệ thống thật)

      // (BỎ đảo bếp + 2 ghế đẩu + đồ trên đảo + đèn thả giữa → chừa sàn+thảm trống cho Gumi
      //  ĐỨNG TRÊN THẢM, không còn kẹt dưới mặt đảo. Dãy bếp + thiết bị ở tường sau vẫn đầy đủ.)
      pendant(-2.6, -2.4, 0x3A3A3F, 5.0); pendant(2.6, -2.4, 0x3A3A3F, 5.0);   // đèn thả dời về TRÊN QUẦY BẾP (tường sau)

      // Thảm runner CHÍNH GIỮA · cây góc đối xứng · đèn tổng
      place('rugRectangle', 0, 0.02, 0.9, 3.4, 0, 0xDCD2C2);
      place('pottedPlant', -5.2, 0, 0.6, 1.4, 0); place('pottedPlant', 5.2, 0, 0.6, 1.4, 0);
      const kGlow = new THREE.PointLight(0xFFF1D6, 2.4, 15, 2); kGlow.position.set(0, 6.7, 0.6); scene.add(kGlow);
      lamp = tableLamp(5.2, -1.2, false);                           // đèn đứng góc phải (BẤM bật/tắt)
      contact(-5.2, 0.6, 1.6); contact(5.2, 0.6, 1.6);
    } else {
      floorMat.map!.repeat.set(3, 3);
      // LAN CAN gỗ + tay vịn
      const railMat = mat(0xE8D3A8, 0.8);
      for (let x = -5; x <= 5; x += 0.6) box(0.12, 1.2, 0.12, railMat, x, 0.6, -2.62);
      box(11, 0.2, 0.3, mat(0xD9B87E, 0.8), 0, 1.26, -2.62);
      box(11, 0.2, 0.3, mat(0xC49A63, 0.8), 0, 0.1, -2.62, false);
      // ===== TẦM NHÌN XUỐNG THÀNH PHỐ — skyline nhiều lớp, cửa sổ sáng đèn (chill buổi tối) =====
      const cityBase = track(cityTexture());
      const rnd = (a: number, b: number) => a + Math.random() * (b - a);
      for (const [zc, count, tint, topMax] of [[-30, 12, 0.68, 3.4], [-22, 10, 0.82, 2.4], [-15, 8, 1.0, 1.4]] as const) {
        for (let i = 0; i < count; i++) {
          const w = rnd(1.6, 3.4), d = rnd(1.6, 3.0), bh = rnd(4, 11), top = rnd(-0.8, topMax);
          const tex = track(cityBase.clone()); tex.needsUpdate = true;
          tex.repeat.set(Math.max(1, Math.round(w)), Math.max(2, Math.round(bh / 1.5)));
          const bm = track(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); bm.color.setScalar(tint);
          const bld = new THREE.Mesh(track(new THREE.BoxGeometry(w, bh, d)), bm);
          bld.position.set(rnd(-16, 16), top - bh / 2, zc + rnd(-2.5, 2.5)); scene.add(bld);
        }
      }
      // Dải sáng đô thị mờ ở chân trời (glow ấm) cho có chiều sâu
      const glow = new THREE.Mesh(track(new THREE.PlaneGeometry(44, 6)), track(new THREE.MeshBasicMaterial({ color: 0xFFCE86, transparent: true, opacity: 0.16, toneMapped: false, depthWrite: false })));
      glow.position.set(0, 0.4, -33); scene.add(glow);
      const cloudMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
      const puffs: [number, number, number][] = [[0, 0, 0.9], [0.8, -0.1, 0.7], [-0.8, -0.1, 0.6], [0.3, 0.3, 0.6]];
      for (const [cx, cy, cz, cs] of [[-3.5, 4.2, -12, 1.1], [2.8, 5, -13, 1.4], [5, 3.6, -11, 0.8]] as const) {
        const cl = new THREE.Group(); cl.position.set(cx, cy, cz);
        for (const [dx, dy, r] of puffs) { const puff = new THREE.Mesh(track(new THREE.SphereGeometry(r * cs, 14, 10)), cloudMat); puff.position.set(dx * cs, dy * cs, 0); cl.add(puff); }
        scene.add(cl);
      }
      // BỒN CÂY đều nhau dọc lan can (bụi xanh + hoa) — đối xứng
      for (const px of [-4.5, -1.5, 1.5, 4.5]) {
        box(1.3, 0.34, 0.34, mat(0xA9764E, 0.7), px, 1.5, -2.55);
        for (const dx of [-0.42, -0.14, 0.14, 0.42]) { const bush = new THREE.Mesh(track(new THREE.SphereGeometry(0.19, 12, 10)), mat(p.leaf[(Math.abs(dx * 10) | 0) % 3]!, 0.72)); bush.position.set(px + dx, 1.78, -2.55); bush.castShadow = true; scene.add(bush); }
        for (const [dx, fc] of [[-0.3, 0xF2A0B8], [0.28, 0xFFD27A]] as const) { const f = new THREE.Mesh(track(new THREE.SphereGeometry(0.07, 8, 8)), mat(fc, 0.6)); f.position.set(px + dx, 1.93, -2.5); scene.add(f); }
      }
      // ĐÈN DÂY festoon vắt ngang ban công (bóng ấm) + 2 đèn điểm
      for (let i = 0; i <= 14; i++) { const t = i / 14, bx = -5 + t * 10, byy = 3.2 - Math.sin(t * Math.PI) * 0.6; const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.07, 8, 6)), track(new THREE.MeshBasicMaterial({ color: i % 2 ? 0xFFE29A : 0xFFF3D6 }))); bulb.position.set(bx, byy, -1.2); scene.add(bulb); }
      const fl1 = new THREE.PointLight(0xFFE29A, 1.3, 11, 2); fl1.position.set(-2.4, 3, -0.8); scene.add(fl1);
      const fl2 = new THREE.PointLight(0xFFE29A, 1.3, 11, 2); fl2.position.set(2.4, 3, -0.8); scene.add(fl2);
      // Thảm ngoài trời CHÍNH GIỮA — chừa trống cho Gumi ĐỨNG TRÊN THẢM (đã BỎ bàn bistro + nến giữa)
      place('rugRounded', 0, 0.02, 0.6, 3.8, 0, 0xDBCBB2);
      // Nệm ngồi bệt (pouf) — góc thư giãn ngắm phố
      cyl(0.42, 0.46, 0.34, 24, mat(0xC97A5A, 0.9), -3.0, 0.17, 1.9); contact(-3.0, 1.9, 1.35);
      const candle = new THREE.PointLight(0xFFCE86, 0.8, 4, 2); candle.position.set(-3.0, 0.8, 1.9); scene.add(candle); // ánh ấm nhẹ ở góc pouf
      // HAI ghế (ngà), đối xứng, cùng hướng vào GIỮA (giờ hướng về Gumi trên thảm)
      place('loungeChair', -1.7, 0, 0.5, 1.2, 0.5, 0x4E4E52); place('loungeChair', 1.7, 0, 0.5, 1.2, -0.5, 0x4E4E52);
      contact(-1.7, 0.5, 1.5); contact(1.7, 0.5, 1.5);
      // ĐÈN LỒNG phát sáng ở 2 góc ĐỐI XỨNG (ấm cúng)
      for (const [lx, lz] of [[-4.7, 0.9], [4.7, 0.9]] as const) {
        box(0.34, 0.5, 0.34, track(new THREE.MeshStandardMaterial({ color: 0xE8B15A, roughness: 0.4, emissive: 0xFFD98A, emissiveIntensity: 0.75 })), lx, 0.55, lz);
        box(0.42, 0.08, 0.42, mat(0x6E4B2E, 0.6), lx, 0.85, lz);
        const ll = new THREE.PointLight(0xFFD98A, 1.6, 6, 2); ll.position.set(lx, 0.7, lz); scene.add(ll);
      }
      // CHẬU CÂY + cây rủ treo — đối xứng từng cặp
      place('pottedPlant', -5.3, 0, 1.2, 1.4, 0); place('pottedPlant', 5.3, 0, 1.2, 1.4, 0);
      plant(-3.5, 1.5, 1.1); plant(3.5, 1.5, 1.1);
      trailingPlant(-2.5, 3.1, -1.0); trailingPlant(2.5, 3.1, -1.0);
      lamp = tableLamp(-4.7, -1.2, false);
      contact(-4.7, -1.2, 1.6);
    }

    // Gom mọi ĐÈN ĐIỂM của phòng (trừ đèn bàn `lamp` xử lý riêng ở vòng lặp) để công tắc đèn giảm/tắt được.
    const dimLights: { l: THREE.PointLight; base: number }[] = [];
    scene.traverse((o) => { const pl = o as THREE.PointLight; if (pl.isPointLight && pl !== lamp) dimLights.push({ l: pl, base: pl.intensity }); });

    // Bụi lơ lửng
    const dustGeo = track(new THREE.BufferGeometry());
    const ND = q.dust; const dpos = new Float32Array(ND * 3); const dvel = new Float32Array(ND);
    for (let i = 0; i < ND; i++) { dpos[i * 3] = (Math.random() - 0.5) * 13; dpos[i * 3 + 1] = Math.random() * 7; dpos[i * 3 + 2] = (Math.random() - 0.5) * 8; dvel[i] = 0.1 + Math.random() * 0.25; }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    scene.add(new THREE.Points(dustGeo, track(new THREE.PointsMaterial({ color: garden ? 0xffffff : 0xffe7b0, size: 0.05, transparent: true, opacity: 0.3, depthWrite: false }))));

    // Mưa & tuyết — luôn tạo, hiện/ẩn mượt bằng opacity theo mood.
    const RN = q.rain; const rpos = new Float32Array(RN * 6); const rvy = new Float32Array(RN);
    for (let i = 0; i < RN; i++) {
      const x = (Math.random() - 0.5) * 16, y = Math.random() * 9, z = (Math.random() - 0.5) * 6 + 1, len = 0.34 + Math.random() * 0.22;
      rpos[i * 6] = x; rpos[i * 6 + 1] = y; rpos[i * 6 + 2] = z; rpos[i * 6 + 3] = x + 0.03; rpos[i * 6 + 4] = y - len; rpos[i * 6 + 5] = z; rvy[i] = 0.16 + Math.random() * 0.12;
    }
    const rainGeo = track(new THREE.BufferGeometry()); rainGeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
    const rainMat = track(new THREE.LineBasicMaterial({ color: 0x9EB6CC, transparent: true, opacity: 0, depthWrite: false }));
    const rainObj = new THREE.LineSegments(rainGeo, rainMat); rainObj.visible = false; scene.add(rainObj);

    const SN = q.snow; const spos = new Float32Array(SN * 3); const svy = new Float32Array(SN); const sph = new Float32Array(SN);
    for (let i = 0; i < SN; i++) { spos[i * 3] = (Math.random() - 0.5) * 16; spos[i * 3 + 1] = Math.random() * 9; spos[i * 3 + 2] = (Math.random() - 0.5) * 7 + 1; svy[i] = 0.012 + Math.random() * 0.02; sph[i] = Math.random() * 6.28; }
    const snowGeo = track(new THREE.BufferGeometry()); snowGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
    const snowMat = track(new THREE.PointsMaterial({ map: track(softDot()), color: 0xffffff, size: 0.16, transparent: true, opacity: 0, depthWrite: false }));
    const snowObj = new THREE.Points(snowGeo, snowMat); snowObj.visible = false; scene.add(snowObj);

    // ===== Hậu kỳ =====
    let composer: EffectComposer | null = null;
    let bloom: UnrealBloomPass | null = null;
    if (!reduce && q.bloom) { // hậu kỳ toả sáng CHỈ bật ở máy khoẻ; máy yếu/mobile render thẳng cho nhẹ
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      composer = new EffectComposer(renderer, rt);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), M0.bloom, 0.55, 0.92); // ngưỡng 0.92 → chỉ điểm sáng THẬT mới toả, tường/đồ ấm KHÔNG bị chói
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }

    const BASE_ASPECT = 1.5, BASE_Z = 6.6;
    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false); composer?.setSize(w, h); bloom?.setSize(w, h);
      const aspect = w / h; camera.aspect = aspect;
      // Màn dọc (mobile) hẹp ngang → lùi camera nhiều hơn để lộ trọn tường gallery + nhiều nội thất.
      camera.position.z = BASE_Z * Math.min(2.35, Math.max(1, BASE_ASPECT / aspect));
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
      dim: 1, // 1 = bật đèn (sáng) · ~0.3 = tắt đèn (tối) — nội suy mượt
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

      // Công tắc ĐÈN phòng: tắt → dim cả phòng cho tối (đèn bàn vẫn hắt ấm), bật → sáng đủ.
      cur.dim = lerp(cur.dim, lightsRef.current ? 1 : 0.24, k);
      const dl = cur.dim;
      renderer.toneMappingExposure = cur.exposure * dl;
      ambient.intensity = cur.ambI * dl; ambient.color.copy(cur.amb);
      hemi.intensity = baseHemi * cur.hemiMul * dl;
      sun.intensity = cur.sunI * dl; sun.color.copy(cur.sun); sun.position.copy(cur.sunPos);
      fill.intensity = 0.34 * cur.hemiMul * dl; fillL.intensity = 0.3 * cur.hemiMul * dl;
      scene.environmentIntensity = cur.envI * (0.35 + 0.65 * dl);
      for (const dz of dimLights) dz.l.intensity = dz.base * (0.12 + 0.88 * dl); // đèn trần/thả/tường mờ hẳn khi tắt
      (scene.background as THREE.Color).copy(cur.bg).multiplyScalar(0.42 + 0.58 * dl); fog.color.copy(cur.bg).multiplyScalar(0.42 + 0.58 * dl); fog.near = cur.fogNear; fog.far = cur.fogFar;
      if (bloom) bloom.strength = cur.bloom;
      // Mưa/tuyết chỉ hiện NGOÀI TRỜI (ban công), rõ nét. Trong nhà chỉ thấy thời tiết qua cửa sổ.
      // Hạt mưa/tuyết CHỈ rơi NGOÀI TRỜI (ban công). Trong nhà chỉ thấy thời tiết QUA CỬA SỔ (bầu trời + vệt mưa/bông tuyết vẽ trong kính).
      rainMat.opacity = cur.rainW * 0.85; rainObj.visible = garden && cur.rainW > 0.02;
      snowMat.opacity = cur.snowW; snowObj.visible = garden && cur.snowW > 0.02;
    };
    applyMood(1); // đặt đúng mood ban đầu ngay lập tức

    const render = () => { if (composer) composer.render(); else renderer.render(scene, camera); };
    const clock = new THREE.Clock();
    const frameMin = q.fpsCap > 0 ? 1 / q.fpsCap : 0; // giới hạn FPS ở máy yếu (đỡ nóng máy, tiết kiệm pin)
    let acc = 0;
    const loop = () => {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      acc += clock.getDelta();
      if (frameMin && acc < frameMin) return; // chưa tới nhịp khung kế → bỏ qua, GIỮ thời gian dồn cho lần render sau
      const t = clock.getElapsedTime();
      const dt = Math.min(0.05, acc); acc = 0; // dt = thời gian DỒN từ khung vẽ trước → hoạt ảnh không bị chậm khi giới hạn FPS
      applyMood(1 - Math.pow(1e-8, dt)); // chuyển gần như TỨC THÌ (~0.15s) khi đổi thời tiết/đèn
      // Bầu trời NGOÀI cửa sổ đổi NGAY khi đổi thời tiết (ánh sáng phòng thì fade mượt)
      if (weatherRef.current !== lastWeather) { lastWeather = weatherRef.current; glassMat.map = skyTexes[lastWeather]; glassMat.needsUpdate = true; }

      camera.position.x = Math.sin(t * 0.16) * 0.2; camera.position.y = 2.1 + Math.sin(t * 0.22) * 0.05; camera.lookAt(0, 1.5, -0.4);
      const a = dustGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < ND; i++) { let y = a.getY(i) + dvel[i]! * 0.01; if (y > 7) y = 0; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t + i) * 0.0006); }
      a.needsUpdate = true;
      for (const s of swayers) s.rotation.z = Math.sin(t * 0.7 + (s.userData.ph as number)) * 0.045;
      for (const c of cloth) c.rotation.y = Math.sin(t * 0.5 + (c.userData.ph as number)) * 0.03;
      // Mưa/tuyết RƠI ĐỘNG trên cửa sổ (nhìn qua kính thấy chân thực) — chỉ dùng lớp phủ, không hạt trong phòng.
      // offset.y TĂNG dần → mưa/tuyết RƠI XUỐNG (trước đây âm nên chạy ngược lên trên).
      if (cur.rainW > 0.02) { if (fxKind !== 'rain') { fxMat.map = rainFx; fxKind = 'rain'; } fxMat.opacity = cur.rainW; rainFx.offset.y = (t * 1.9) % 1; }
      else if (cur.snowW > 0.02) { if (fxKind !== 'snow') { fxMat.map = snowFx; fxKind = 'snow'; } fxMat.opacity = cur.snowW; snowFx.offset.y = (t * 0.32) % 1; snowFx.offset.x = Math.sin(t * 0.4) * 0.05; }
      else if (fxKind !== 'none') { fxMat.opacity = 0; fxKind = 'none'; }
      if (clock3D) { const d = new Date(); const sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + min / 60; clock3D.s.rotation.z = -sec / 60 * 6.283; clock3D.m.rotation.z = -min / 60 * 6.283; clock3D.h.rotation.z = -hr / 12 * 6.283; }
      if (rainObj.visible) {
        for (let i = 0; i < RN; i++) { const dy = rvy[i]!; rpos[i * 6 + 1] -= dy; rpos[i * 6 + 4] -= dy; if (rpos[i * 6 + 1] < 0) { const top = 9 + Math.random() * 2, len = rpos[i * 6 + 1] - rpos[i * 6 + 4]; rpos[i * 6 + 1] = top; rpos[i * 6 + 4] = top - len; } }
        rainGeo.attributes.position.needsUpdate = true;
      }
      if (snowObj.visible) {
        const sp = snowGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < SN; i++) { let y = sp.getY(i) - svy[i]!; if (y < 0) y = 9 + Math.random(); sp.setY(i, y); sp.setX(i, sp.getX(i) + Math.sin(t * 0.6 + sph[i]!) * 0.006); }
        sp.needsUpdate = true;
      }
      if (lamp) lamp.intensity = (lampOn ? cur.lamp + Math.sin(t * 5) * 0.35 + Math.sin(t * 13) * 0.1 : 0) * (0.18 + 0.82 * cur.dim);
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
  }, [act, variant, narrow]);

  return <div ref={host} aria-hidden="true" className="absolute inset-0" />;
}
