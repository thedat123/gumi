#!/usr/bin/env node
/**
 * Kiểm tra tương phản màu theo WCAG 2.x từ tokens.json.
 *   node check_contrast.mjs [docs/ui/tokens.json] [--json]
 * tokens.json: { "colors": { "text": "#2B2B2B", "bg": "#FFF8EE" }, "pairs": [ { "fg": "text", "bg": "bg", "usage": "body" } ] }
 * usage: body (≥4.5) | large (≥3, chữ ≥24px hoặc ≥18.66px đậm) | ui (≥3, viền/biểu tượng/nút)
 * Chỉ nhận màu hex đặc (#rgb hoặc #rrggbb). Thoát 1 nếu có cặp không đạt.
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const file = args.find((a) => !a.startsWith('--')) || 'docs/ui/tokens.json';
const MIN = { body: 4.5, large: 3, ui: 3 };

function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Màu không hợp lệ: "${hex}" (chỉ nhận hex đặc)`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const ratio = (a, b) => { const [x, y] = [lum(hexToRgb(a)), lum(hexToRgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

let tokens;
try { tokens = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`Không đọc được ${file}: ${e.message}`); process.exit(2); }

const rows = [];
let bad = 0;
for (const p of tokens.pairs || []) {
  const fg = tokens.colors?.[p.fg], bg = tokens.colors?.[p.bg];
  if (!fg || !bg) { rows.push({ ...p, error: `thiếu màu ${!fg ? p.fg : p.bg} trong colors` }); bad++; continue; }
  try {
    const r = ratio(fg, bg);
    const min = MIN[p.usage || 'body'] ?? 4.5;
    const pass = r >= min;
    if (!pass) bad++;
    rows.push({ fg: p.fg, bg: p.bg, usage: p.usage || 'body', ratio: Number(r.toFixed(2)), min, pass });
  } catch (e) { rows.push({ ...p, error: e.message }); bad++; }
}

if (asJson) console.log(JSON.stringify({ failed: bad, rows }, null, 2));
else {
  for (const r of rows) {
    if (r.error) console.log(`  ✖ ${r.fg}/${r.bg}: ${r.error}`);
    else console.log(`  ${r.pass ? '✔' : '✖'} ${r.fg} trên ${r.bg} [${r.usage}]: ${r.ratio}:1 (cần ≥ ${r.min})`);
  }
  console.log(bad ? `\n✖ ${bad} cặp không đạt` : '\n✔ Mọi cặp màu đạt');
}
process.exit(bad ? 1 : 0);
