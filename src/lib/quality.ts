/**
 * Phân hạng đồ hoạ THIẾT BỊ (low / mid / high) để cảnh 3D, hạt động và hiệu ứng
 * tự hạ chi tiết cho MƯỢT trên máy yếu / điện thoại, giữ đẹp trên máy khoẻ.
 *
 * Đo một lần (cache), suy từ: GPU (chuỗi renderer WebGL), RAM (deviceMemory),
 * số nhân CPU (hardwareConcurrency), điện thoại (con trỏ thô + màn nhỏ) và
 * "giảm chuyển động". Đồng thời gắn class `gfx-low|gfx-mid|gfx-high` lên <html>
 * để CSS hạ tải theo (ví dụ tắt backdrop-blur trên máy yếu).
 */
export type Tier = 'low' | 'mid' | 'high';

export interface Quality {
  tier: Tier;
  reduce: boolean;      // người dùng bật "giảm chuyển động" → dựng tĩnh
  particles: boolean;   // cho phép lớp hạt PixiJS (tải pixi.js + init WebGL) — TẮT ở máy yếu/mạng chậm
  pixelRatio: number;   // trần devicePixelRatio khi render
  antialias: boolean;
  shadows: boolean;
  shadowMap: number;    // cạnh shadow map (px)
  bloom: boolean;       // hậu kỳ toả sáng (đắt) — chỉ máy khoẻ
  fpsCap: number;       // 0 = không giới hạn
  dust: number; rain: number; snow: number; // số hạt
  pixiCount: number;    // hệ số nhân số hạt PixiJS (0..1)
}

const PRESET: Record<Tier, Omit<Quality, 'tier' | 'reduce' | 'particles'>> = {
  low:  { pixelRatio: 1,   antialias: false, shadows: false, shadowMap: 512,  bloom: false, fpsCap: 30, dust: 16, rain: 70,  snow: 90,  pixiCount: 0.4 },
  mid:  { pixelRatio: 1.5, antialias: true,  shadows: true,  shadowMap: 1024, bloom: false, fpsCap: 60, dust: 40, rain: 150, snow: 200, pixiCount: 0.7 },
  high: { pixelRatio: 2,   antialias: true,  shadows: true,  shadowMap: 1024, bloom: true,  fpsCap: 0,  dust: 60, rain: 220, snow: 300, pixiCount: 1 },
};

function gpuIsWeak(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return true; // không có WebGL → coi như yếu
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    // Render phần mềm / GPU ảo → rất yếu.
    const weak = /swiftshader|software|llvmpipe|basic render|microsoft basic/i.test(r);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return weak;
  } catch { return false; }
}

/** Thiết bị cầm tay (con trỏ thô + màn hẹp): điện thoại/tablet nhỏ. Đo 1 lần, cache.
 *  Dùng để ÉP phòng 2D trên MỌI mobile (không tải Three.js) → vào mượt, máy yếu nhất cũng load được. */
let cachedMobile: boolean | null = null;
export function isMobile(): boolean {
  if (cachedMobile !== null) return cachedMobile;
  if (typeof window === 'undefined') { cachedMobile = false; return cachedMobile; }
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const smallW = Math.min(window.screen?.width ?? 1024, window.innerWidth || 1024);
  cachedMobile = coarse && smallW <= 820;
  return cachedMobile;
}

type NetInfo = { saveData?: boolean; effectiveType?: string };

/** Mạng CHẬM (2G/3G) hoặc bật "tiết kiệm dữ liệu" → ưu tiên tải nhẹ (bỏ chunk nặng, không init WebGL phụ). */
export function isSlowNetwork(): boolean {
  if (typeof navigator === 'undefined') return false;
  const c = (navigator as Navigator & { connection?: NetInfo }).connection;
  if (!c) return false;
  if (c.saveData === true) return true;
  return c.effectiveType === 'slow-2g' || c.effectiveType === '2g' || c.effectiveType === '3g';
}

function detect(): Tier {
  if (typeof window === 'undefined') return 'high';
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: NetInfo };
  const memKnown = typeof nav.deviceMemory === 'number';
  const mem = nav.deviceMemory ?? 4;                 // GB (một số trình duyệt không có → giả định 4)
  const cores = nav.hardwareConcurrency ?? 4;
  const mobile = isMobile();

  // Mạng chậm / tiết kiệm dữ liệu / GPU ảo / RAM-CPU thấp → hạng THẤP NHẤT (phòng 2D, không hạt WebGL).
  if (isSlowNetwork() || gpuIsWeak() || mem <= 2 || cores <= 2) return 'low';
  // Điện thoại KHÔNG báo RAM + ít nhân thường là máy đời thấp → coi là yếu để chạy mượt.
  if (mobile && !memKnown && cores <= 4) return 'low';
  if (mem <= 4 || cores <= 4 || (mobile && (mem <= 6 || cores <= 6))) return 'mid';
  return 'high';
}

/** Ép hạng đồ hoạ thủ công qua URL `?gfx=low|mid|high` hoặc localStorage['gfx'].
 *  Hữu ích khi auto-detect bắt sai máy (người dùng máy siêu yếu có thể ép 'low' để chạy mượt). */
function forcedTier(): Tier | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('gfx');
    if (fromUrl) localStorage.setItem('gfx', fromUrl);         // nhớ lựa chọn cho các lần sau
    const s = (fromUrl || localStorage.getItem('gfx') || '').toLowerCase();
    if (s === 'low' || s === 'mid' || s === 'high') return s;
  } catch { /* private mode */ }
  return null;
}

let cached: Quality | null = null;

export function getQuality(): Quality {
  if (cached) return cached;
  const reduce = typeof window !== 'undefined'
    && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.classList.contains('rm'));
  const tier = forcedTier() ?? detect();
  // Lớp hạt PixiJS (tải pixi.js ~239KB + init WebGL) CHỈ bật ở máy khá trở lên, không "giảm chuyển động",
  // không mạng chậm → máy siêu yếu/3G KHÔNG tốn băng thông & CPU cho hạt trang trí.
  const particles = tier !== 'low' && !reduce && !isSlowNetwork();
  cached = { tier, reduce, particles, ...PRESET[tier] };
  return cached;
}

/** Gắn class hạng đồ hoạ lên <html> để CSS hạ tải (gọi 1 lần lúc khởi động). */
export function applyGfxClass(): void {
  if (typeof document === 'undefined') return;
  const { tier } = getQuality();
  const el = document.documentElement;
  el.classList.remove('gfx-low', 'gfx-mid', 'gfx-high');
  el.classList.add(`gfx-${tier}`);
}
