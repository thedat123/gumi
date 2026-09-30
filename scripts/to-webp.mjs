// Chuyển các ảnh ĐANG DÙNG sang WebP để giảm dung lượng tải trên mobile.
// Skin Gumi giữ chất lượng cao (q90 + alpha 100) vì phải "y chang" mascot; ảnh/illustration q80.
import sharp from 'sharp';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const SKINS = ['gumi-cream', 'gumi-blue', 'gumi-gold', 'gumi-rose', 'gumi-burgundy', 'gumi-brown'];

const jobs = [
  ...SKINS.map((n) => ({ src: `src/assets/${n}.png`, q: 90, alpha: true })),
  { src: 'src/assets/cat-girl-pearl.jpg', q: 80, alpha: false },
  { src: 'src/assets/gumayusi-win.jpeg', q: 80, alpha: false },
  { src: 'src/assets/games/rebus-tra-thai.png', q: 80, alpha: true },
  { src: 'src/assets/games/rebus-cam-vat.png', q: 80, alpha: true },
  { src: 'src/assets/games/rebus-sua-gao.png', q: 80, alpha: true },
];

const kb = (b) => (b / 1024).toFixed(0);
let before = 0, after = 0;

for (const j of jobs) {
  const inPath = resolve(ROOT, j.src);
  const outPath = inPath.replace(/\.(png|jpe?g)$/i, '.webp');
  const inSize = statSync(inPath).size;
  await sharp(inPath)
    .webp({ quality: j.q, alphaQuality: j.alpha ? 100 : undefined, effort: 6 })
    .toFile(outPath);
  const outSize = statSync(outPath).size;
  before += inSize; after += outSize;
  console.log(`${j.src.padEnd(38)} ${kb(inSize).padStart(5)}KB → ${kb(outSize).padStart(5)}KB  (-${(100 - (outSize / inSize) * 100).toFixed(0)}%)`);
}

console.log(`\nTỔNG: ${kb(before)}KB → ${kb(after)}KB  (giảm ${(100 - (after / before) * 100).toFixed(0)}%, tiết kiệm ${kb(before - after)}KB)`);
