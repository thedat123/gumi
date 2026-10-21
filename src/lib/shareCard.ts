// Tạo ảnh "card" Sugar Journey 9:16 để khoe Story/Facebook/Instagram — VẼ TRỰC TIẾP trên canvas
// (không phụ thuộc html-to-image nên không lỗi font/ảnh trên iOS Safari), rồi chia sẻ bằng Web Share API.

export interface CardData {
  heading: string;
  caption: string;
  metrics: { label: string; value: string }[];
  totalLabel: string;
  totalValue: string;
  brand: string;
}

const cssVar = (name: string, fallback: string) => {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' '); const lines: string[] = []; let line = '';
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}

/** Mèo Gumi "Chiến Thần Vàng" (Sugar Master): thân vàng, hào quang, kính râm — vẽ bằng canvas primitive. */
function drawGumi(g: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  g.save(); g.translate(cx, cy); g.scale(s / 100, s / 100);
  // hào quang
  g.strokeStyle = '#FFE08A'; g.lineWidth = 7; g.beginPath(); g.ellipse(0, -78, 42, 12, 0, 0, 7); g.stroke();
  // tai
  g.fillStyle = '#F2C879';
  g.beginPath(); g.moveTo(-34, -34); g.lineTo(-46, -74); g.lineTo(-16, -46); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(34, -34); g.lineTo(46, -74); g.lineTo(16, -46); g.closePath(); g.fill();
  g.fillStyle = '#D9A94A';
  g.beginPath(); g.moveTo(-32, -40); g.lineTo(-40, -64); g.lineTo(-22, -48); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(32, -40); g.lineTo(40, -64); g.lineTo(22, -48); g.closePath(); g.fill();
  // thân + đầu
  g.fillStyle = '#F2C879';
  g.beginPath(); g.ellipse(0, 42, 58, 60, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(0, -6, 48, 0, 7); g.fill();
  g.fillStyle = '#FFF6DD'; g.beginPath(); g.ellipse(0, 52, 34, 40, 0, 0, 7); g.fill();
  // kính râm (Sugar Master)
  g.fillStyle = '#2A2320';
  roundRect(g, -40, -14, 30, 20, 9); g.fill();
  roundRect(g, 10, -14, 30, 20, 9); g.fill();
  g.lineWidth = 4; g.strokeStyle = '#2A2320'; g.beginPath(); g.moveTo(-10, -6); g.lineTo(10, -6); g.stroke();
  // miệng cười
  g.strokeStyle = '#8A6A2A'; g.lineWidth = 4; g.beginPath(); g.arc(0, 18, 12, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  // lấp lánh
  g.fillStyle = '#FFF3C2';
  for (const [x, y, r] of [[-66, -40, 6], [64, -20, 5], [58, 60, 5]] as const) { star(g, x, y, r); }
  g.restore();
}
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283 - Math.PI / 2; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); const b = a + 0.628; g.lineTo(x + Math.cos(b) * r * 0.45, y + Math.sin(b) * r * 0.45); }
  g.closePath(); g.fill();
}

// ——— Mascot Gumi THẬT (ảnh gốc public/gumi-hero.png) để vẽ lên thiệp, thay hình canvas thô ———
let mascotPromise: Promise<HTMLImageElement | null> | null = null;
function loadMascot(): Promise<HTMLImageElement | null> {
  if (mascotPromise) return mascotPromise;
  mascotPromise = new Promise((res) => {
    if (typeof Image === 'undefined') { res(null); return; }
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => { mascotPromise = null; res(null); }; // cho thử lại lần sau
    img.src = '/gumi-hero.png';
  });
  return mascotPromise;
}
/** Vẽ mascot (ảnh thật) đứng trên bóng đổ mềm; fallback hình canvas nếu ảnh chưa tải được. */
function drawMascot(g: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, bottomY: number, targetH: number) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.beginPath(); g.ellipse(cx, bottomY - 4, targetH * 0.3, targetH * 0.065, 0, 0, 7); g.fill();
  g.restore();
  if (img && img.width) {
    const w = targetH * (img.width / img.height);
    g.drawImage(img, cx - w / 2, bottomY - targetH, w, targetH);
  } else {
    drawGumi(g, cx, bottomY - targetH * 0.5, targetH * 0.55);
  }
}
/** Rắc hạt confetti/lấp lánh trang trí (vàng + trắng) cho thiệp sinh động. */
function confetti(g: CanvasRenderingContext2D, W: number, seedPts: [number, number, number, string][]) {
  for (const [x, y, r, col] of seedPts) { g.fillStyle = col; star(g, x * W, y, r); }
}

/** Vẽ card 1080×1920 và trả PNG blob. */
export async function renderCard(d: CardData): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  try { await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready; } catch { /* bỏ qua */ }
  const font = "'Be Vietnam Pro', system-ui, sans-serif";
  const primary = cssVar('--color-primary', '#B83556');
  const dark = cssVar('--color-gumi-dark', '#8A3A2A');
  const onP = cssVar('--color-on-primary', '#FFFFFF');
  const gold = '#FFE08A';
  const mascot = await loadMascot();

  // nền gradient chéo + quầng sáng
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, primary); bg.addColorStop(0.5, '#A32C4B'); bg.addColorStop(1, dark);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 720, 60, W / 2, 720, 560);
  glow.addColorStop(0, 'rgba(255,224,138,0.2)'); glow.addColorStop(1, 'rgba(255,224,138,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.beginPath(); g.arc(180, 260, 240, 0, 7); g.fill();
  g.beginPath(); g.arc(940, 1500, 320, 0, 7); g.fill();
  confetti(g, W, [[0.12, 360, 9, gold], [0.88, 420, 8, '#FFFFFF'], [0.2, 760, 7, gold], [0.82, 820, 9, gold], [0.1, 560, 6, '#FFFFFF']]);

  g.fillStyle = onP; g.textAlign = 'center';

  // tiêu đề (thu gọn để chừa khoảng trống dán ảnh phía dưới)
  g.font = `800 56px ${font}`;
  const lines = wrap(g, d.heading, W - 160);
  let y = 180;
  for (const ln of lines) { g.fillText(ln, W / 2, y); y += 68; }

  // mascot THẬT
  drawMascot(g, mascot, W / 2, 660, 340);

  // caption
  g.font = `600 32px ${font}`;
  const cap = wrap(g, d.caption, W - 200); let cy = Math.max(y + 8, 712);
  g.globalAlpha = 0.95; for (const ln of cap) { g.fillText(ln, W / 2, cy); cy += 44; } g.globalAlpha = 1;

  // lưới chỉ số 2×3
  const pad = 80, gap = 24, cols = 2;
  const cw = (W - pad * 2 - gap) / cols, ch = 128;
  let gy = Math.max(cy + 24, 812);
  g.textAlign = 'left';
  d.metrics.slice(0, 6).forEach((mt, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = pad + col * (cw + gap), yy = gy + row * (ch + gap);
    g.fillStyle = 'rgba(255,255,255,0.15)'; roundRect(g, x, yy, cw, ch, 24); g.fill();
    g.fillStyle = onP; g.globalAlpha = 0.85; g.font = `600 25px ${font}`;
    for (const [j, ln] of wrap(g, mt.label, cw - 48).slice(0, 2).entries()) g.fillText(ln, x + 26, yy + 42 + j * 28);
    g.globalAlpha = 1; g.font = `800 42px ${font}`; g.fillText(mt.value, x + 26, yy + ch - 26);
  });
  gy += 3 * (ch + gap);

  // tổng điểm
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(g, pad, gy + 2, W - pad * 2, 104, 28); g.fill();
  g.fillStyle = onP; g.globalAlpha = 0.85; g.font = `600 28px ${font}`; g.fillText(d.totalLabel, W / 2, gy + 44);
  g.globalAlpha = 1; g.font = `800 56px ${font}`; g.fillText(d.totalValue, W / 2, gy + 92);


  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png', 0.95));
}

/**
 * Poster 9:16 cho ngày SHARE ("rủ bạn bớt ngọt") — để có SẴN một tấm ảnh đăng thẳng lên Story.
 * (Mobile không thể đăng Story nếu không có ảnh; chia sẻ ảnh đơn này → app hiện "Thêm vào Story".)
 * Kèm số liệu thật (thìa đường đã giảm, ly healthy, chuỗi ngày) để khoe tiến độ.
 */
export async function renderSharePoster(d: {
  heading: string; big: string; subtitle: string; brand: string;
  stats?: { label: string; value: string }[];
}): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  try { await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready; } catch { /* bỏ qua */ }
  const font = "'Be Vietnam Pro', system-ui, sans-serif";
  const primary = cssVar('--color-primary', '#B83556');
  const dark = cssVar('--color-gumi-dark', '#8A3A2A');
  const onP = cssVar('--color-on-primary', '#FFFFFF');
  const gold = '#FFE08A'; // tông vàng mèo Gumi — làm điểm nhấn nổi trên nền đỏ hồng
  const mascot = await loadMascot();

  // Nền gradient + quầng sáng vàng ấm cho sinh động hơn.
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#C23A5E'); bg.addColorStop(0.55, primary); bg.addColorStop(1, dark);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 760, 60, W / 2, 760, 560);
  glow.addColorStop(0, 'rgba(255,224,138,0.24)'); glow.addColorStop(1, 'rgba(255,224,138,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.beginPath(); g.arc(160, 300, 240, 0, 7); g.fill();
  g.beginPath(); g.arc(940, 1600, 300, 0, 7); g.fill();
  confetti(g, W, [[0.12, 420, 9, gold], [0.86, 360, 8, '#FFFFFF'], [0.18, 880, 7, gold], [0.84, 920, 9, gold], [0.1, 640, 6, '#FFFFFF'], [0.9, 700, 7, gold]]);

  // Khung viền mảnh bo tròn cho cảm giác "tấm thiệp".
  g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 3;
  roundRect(g, 40, 40, W - 80, H - 80, 44); g.stroke();

  g.textAlign = 'center';

  // Eyebrow trong "pill" bo tròn.
  g.font = `800 40px ${font}`;
  const ew = Math.min(W - 160, g.measureText(d.heading).width + 72);
  g.fillStyle = 'rgba(255,255,255,0.16)'; roundRect(g, (W - ew) / 2, 236, ew, 78, 39); g.fill();
  g.fillStyle = gold; g.fillText(d.heading, W / 2, 288);

  // mascot THẬT (thu gọn để chừa khoảng trống dán ảnh ở nửa dưới)
  drawMascot(g, mascot, W / 2, 700, 360);

  // Dòng lớn (ngày X/14) — vàng nổi bật; thu nhỏ 1 xíu để nén bố cục.
  g.fillStyle = gold; g.font = `900 96px ${font}`;
  g.fillText(d.big, W / 2, 824);

  // Số liệu thật dạng 3 ô.
  const stats = (d.stats ?? []).slice(0, 3);
  let subY = 1010;
  if (stats.length) {
    const pad = 70, gap = 24, n = stats.length;
    const cw = (W - pad * 2 - gap * (n - 1)) / n, ch = 188, cy = 884;
    stats.forEach((st, i) => {
      const x = pad + i * (cw + gap);
      g.fillStyle = 'rgba(255,255,255,0.14)'; roundRect(g, x, cy, cw, ch, 30); g.fill();
      g.fillStyle = gold; g.font = `900 72px ${font}`; g.fillText(st.value, x + cw / 2, cy + 96);
      g.fillStyle = onP; g.globalAlpha = 0.9; g.font = `600 26px ${font}`;
      wrap(g, st.label, cw - 28).slice(0, 2).forEach((ln, j) => g.fillText(ln, x + cw / 2, cy + 138 + j * 32));
      g.globalAlpha = 1;
    });
    subY = cy + ch + 74;
  }

  // CTA phụ đề.
  g.fillStyle = onP; g.font = `600 38px ${font}`; g.globalAlpha = 0.95;
  for (const ln of wrap(g, d.subtitle, W - 200)) { g.fillText(ln, W / 2, subY); subY += 50; }
  g.globalAlpha = 1;


  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png', 0.95));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

// ——— Chia sẻ Facebook/Messenger (desktop) qua trang og:image ———
// Desktop KHÔNG gửi được file ảnh lên FB; sharer.php chỉ đọc og:image của URL.
// Nên upload ảnh lên bucket công khai (uploadShareCard) rồi share URL của Edge Function 'share-card'
// — trang này trả HTML có og:image trỏ tới ảnh vừa upload → FB hiện ĐÚNG ảnh card.
const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').replace(/\/$/, '');
const CARDS_MARKER = '/storage/v1/object/public/cards/';

/** Kiểu callback upload lấy từ API (api.uploadShareCard): trả public URL hoặc null nếu không host được. */
export type UploadCard = (blob: Blob, name: string) => Promise<string | null>;

/** Dựng URL trang share-card (og:image) từ public URL của ảnh đã upload. null nếu không dựng được. */
function sharePageUrl(publicImageUrl: string, o: { title?: string; desc?: string; appUrl?: string }): string | null {
  const idx = publicImageUrl.indexOf(CARDS_MARKER);
  if (!SUPABASE_URL || idx === -1) return null;
  const p = new URLSearchParams({ i: publicImageUrl.slice(idx + CARDS_MARKER.length) });
  if (o.title) p.set('t', o.title);
  if (o.desc) p.set('d', o.desc);
  if (o.appUrl) p.set('u', o.appUrl);
  return `${SUPABASE_URL}/functions/v1/share-card?${p.toString()}`;
}

function openFacebookShare(url: string, quote?: string): void {
  const q = quote ? `&quote=${encodeURIComponent(quote)}` : '';
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}${q}`,
    '_blank', 'noopener,noreferrer,width=640,height=560',
  );
}

export interface SocialShareOpts {
  caption: string;
  filename?: string;
  title?: string;
  desc?: string;
  appUrl?: string;
  /** Hàm upload ảnh công khai (api.uploadShareCard) — cần cho đường desktop. */
  upload?: UploadCard;
}

/**
 * Chia sẻ ẢNH trực tiếp lên Facebook/Messenger (wall & story), cả điện thoại lẫn máy tính.
 * - 📱 Mobile / hỗ trợ Web Share file: mở khay OS → FB/Messenger đăng THẲNG ảnh lên Feed/Story.
 * - 💻 Desktop: upload ảnh công khai → mở sharer.php với trang og:image → FB HIỆN ảnh card (copy sẵn caption).
 * - Không host được (mock / lỗi): tải ảnh về + mở FB để người dùng tự đính ảnh.
 */
export async function shareImageToSocial(blob: Blob, opts: SocialShareOpts): Promise<'shared' | 'uploaded' | 'downloaded'> {
  const name = opts.filename ?? 'gumi-card.png';
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean };

  if (nav.canShare?.({ files: [file] }) && typeof navigator.share === 'function') {
    try { await navigator.share({ files: [file], text: opts.caption }); return 'shared'; }
    catch (e) { if ((e as DOMException)?.name === 'AbortError') return 'shared'; /* huỷ → coi như xong */ }
  }

  if (opts.upload) {
    const publicUrl = await opts.upload(blob, name).catch(() => null);
    const page = publicUrl ? sharePageUrl(publicUrl, opts) : null;
    if (page) {
      await copyText(opts.caption); // IG/Story không nhận caption web → copy sẵn để dán
      openFacebookShare(page, opts.caption);
      return 'uploaded';
    }
  }

  downloadBlob(blob, name);
  if (opts.appUrl) openFacebookShare(opts.appUrl, opts.caption);
  return 'downloaded';
}
