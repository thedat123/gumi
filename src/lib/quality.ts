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
  pixelRatio: number;   // trần devicePixelRatio khi render
  antialias: boolean;
  shadows: boolean;
  shadowMap: number;    // cạnh shadow map (px)
  bloom: boolean;       // hậu kỳ toả sáng (đắt) — chỉ máy khoẻ
  fpsCap: number;       // 0 = không giới hạn
  dust: number; rain: number; snow: number; // số hạt
  pixiCount: number;    // hệ số nhân số hạt PixiJS (0..1)
}

const PRESET: Record<Tier, Omit<Quality, 'tier' | 'reduce'>> = {
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
    return /swiftshader|software|llvmpipe|basic render|microsoft basic/i.test(r);
  } catch { return false; }
}

function detect(): Tier {
  if (typeof window === 'undefined') return 'high';
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 4;                 // GB (một số trình duyệt không có → giả định 4)
  const cores = nav.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const smallW = Math.min(window.screen?.width ?? 1024, window.innerWidth || 1024);
  const mobile = coarse && smallW <= 820;

  if (gpuIsWeak() || mem <= 2 || cores <= 2) return 'low';
  if (mem <= 4 || cores <= 4 || (mobile && (mem <= 6 || cores <= 6))) return 'mid';
  return 'high';
}

let cached: Quality | null = null;

export function getQuality(): Quality {
  if (cached) return cached;
  const reduce = typeof window !== 'undefined'
    && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.classList.contains('rm'));
  const tier = detect();
  cached = { tier, reduce, ...PRESET[tier] };
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
