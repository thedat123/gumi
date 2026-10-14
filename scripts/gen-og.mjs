// Tạo ảnh banner Open Graph 1200x630 -> public/og-image.png (vẽ canvas trong headless Chromium).
// Dùng MÈO GUMI đã TÁCH NỀN (public/gumi-cut.png — bỏ nền/viền nét đứt) vẽ TRỰC TIẾP lên nền
// để mèo hoà màu, không khung/viền. Chạy: node scripts/gen-og.mjs
import fs from 'node:fs'; import path from 'node:path';
const { chromium } = await import('@playwright/test');
const catData = 'data:image/png;base64,' + fs.readFileSync(path.resolve('public', 'gumi-cut.png')).toString('base64');

const b = await chromium.launch(); const p = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
const dataUrl = await p.evaluate(async (catSrc) => {
  const W = 1200, H = 630; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const cat = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = catSrc; });
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const star = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283 - Math.PI / 2; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); const bb = a + 0.628; g.lineTo(x + Math.cos(bb) * r * 0.45, y + Math.sin(bb) * r * 0.45); } g.closePath(); g.fill(); };

  // Nền gradient thương hiệu: rose đậm (trái, để chữ trắng nổi) → peach sáng (phải).
  const bg = g.createLinearGradient(0, 0, W, 0);
  bg.addColorStop(0, '#B83556'); bg.addColorStop(0.45, '#C23A5E'); bg.addColorStop(0.78, '#E0789A'); bg.addColorStop(1, '#F4A9B6');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.arc(120, 560, 220, 0, 7); g.fill();
  // quầng sáng ấm sau mèo để mèo "nổi" nhẹ mà vẫn hoà nền (không khung, không viền).
  const glow = g.createRadialGradient(940, 330, 40, 940, 330, 430);
  glow.addColorStop(0, 'rgba(255,224,138,0.22)'); glow.addColorStop(1, 'rgba(255,224,138,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  star(150, 150, 8, 'rgba(255,255,255,0.7)'); star(520, 520, 7, 'rgba(255,210,122,0.85)');

  const font = 'system-ui, sans-serif';

  // Mèo Gumi THẬT (đã tách nền) vẽ TRỰC TIẾP trên nền → hoà màu, không khung/viền; bóng đổ mềm để "đứng".
  if (cat) {
    const hgt = 566, w = hgt * (cat.width / cat.height), cx = 930, bottom = 612;
    g.save(); g.fillStyle = 'rgba(55,12,32,0.18)'; g.beginPath(); g.ellipse(cx, bottom - 8, hgt * 0.26, hgt * 0.05, 0, 0, 7); g.fill(); g.restore();
    g.drawImage(cat, cx - w / 2, bottom - hgt, w, hgt);
  }

  // Chữ bên trái (khung trái 90..sx).
  g.textAlign = 'left';
  g.fillStyle = '#fff'; g.font = `800 104px ${font}`; g.fillText('Mật Độ', 90, 262);
  g.fillStyle = '#FFD27A'; g.font = `800 50px ${font}`; g.fillText('14 ngày bớt ngọt', 92, 338);
  g.fillStyle = '#fff'; g.globalAlpha = .95; g.font = `700 32px ${font}`; g.fillText('Nuôi mèo Gumi · reset vị giác', 92, 408);
  g.globalAlpha = .82; g.font = `600 25px ${font}`; g.fillText('Mỗi ngày một nhiệm vụ · leo bảng Sugar Slayer', 92, 454); g.globalAlpha = 1;
  g.globalAlpha = .92; g.font = `700 24px ${font}`; g.fillText('🐱 matdo.challenge', 92, 560); g.globalAlpha = 1;

  return c.toDataURL('image/png');
}, catData);
await b.close();
const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
const out = path.resolve('public', 'og-image.png'); fs.writeFileSync(out, buf);
console.log('wrote', out, buf.length, 'bytes');
