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

  // nền gradient chéo
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, primary); bg.addColorStop(0.5, '#A32C4B'); bg.addColorStop(1, dark);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.beginPath(); g.arc(180, 260, 240, 0, 7); g.fill();
  g.beginPath(); g.arc(940, 1500, 320, 0, 7); g.fill();

  g.fillStyle = onP; g.textAlign = 'center';

  // tiêu đề
  g.font = `800 58px ${font}`;
  const lines = wrap(g, d.heading, W - 160);
  let y = 210;
  for (const ln of lines) { g.fillText(ln, W / 2, y); y += 74; }

  // mascot
  drawGumi(g, W / 2, 640, 300);

  // caption
  g.font = `600 34px ${font}`;
  const cap = wrap(g, d.caption, W - 200); let cy = 870;
  g.globalAlpha = 0.95; for (const ln of cap) { g.fillText(ln, W / 2, cy); cy += 46; } g.globalAlpha = 1;

  // lưới chỉ số 2×3
  const pad = 80, gap = 28, cols = 2;
  const cw = (W - pad * 2 - gap) / cols, ch = 150;
  let gy = Math.max(cy + 30, 1000);
  g.textAlign = 'left';
  d.metrics.slice(0, 6).forEach((mt, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = pad + col * (cw + gap), yy = gy + row * (ch + gap);
    g.fillStyle = 'rgba(255,255,255,0.15)'; roundRect(g, x, yy, cw, ch, 26); g.fill();
    g.fillStyle = onP; g.globalAlpha = 0.85; g.font = `600 26px ${font}`;
    for (const [j, ln] of wrap(g, mt.label, cw - 48).slice(0, 2).entries()) g.fillText(ln, x + 26, yy + 46 + j * 30);
    g.globalAlpha = 1; g.font = `800 44px ${font}`; g.fillText(mt.value, x + 26, yy + ch - 30);
  });
  gy += 3 * (ch + gap);

  // tổng điểm
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(g, pad, gy + 6, W - pad * 2, 128, 30); g.fill();
  g.fillStyle = onP; g.globalAlpha = 0.85; g.font = `600 30px ${font}`; g.fillText(d.totalLabel, W / 2, gy + 54);
  g.globalAlpha = 1; g.font = `800 64px ${font}`; g.fillText(d.totalValue, W / 2, gy + 112);

  // thương hiệu
  g.globalAlpha = 0.9; g.font = `700 32px ${font}`; g.fillText(`🐱 ${d.brand}`, W / 2, H - 70); g.globalAlpha = 1;

  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png', 0.95));
}

/** Chia sẻ ảnh: ưu tiên Web Share API kèm FILE (mở được Instagram/Facebook/Messenger trên mobile); PC thì tải về. */
export async function shareImage(blob: Blob, opts: { title: string; text: string; filename?: string }): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], opts.filename ?? 'sugar-journey.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean };
  if (nav.canShare?.({ files: [file] }) && typeof navigator.share === 'function') {
    try { await navigator.share({ files: [file], title: opts.title, text: opts.text }); return 'shared'; }
    catch (e) { if ((e as DOMException)?.name === 'AbortError') return 'shared'; /* huỷ share → coi như xong */ }
  }
  downloadBlob(blob, file.name);
  return 'downloaded';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Mở hộp thoại chia sẻ Facebook cho một URL (đăng link chiến dịch). */
export function shareFacebook(url: string): void {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer,width=640,height=560');
}
