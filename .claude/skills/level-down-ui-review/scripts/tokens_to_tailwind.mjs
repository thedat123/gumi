#!/usr/bin/env node
/**
 * Chuyển docs/ui/tokens.json thành cấu hình Tailwind để agent chỉ dùng biến thiết kế đã duyệt.
 *   node tokens_to_tailwind.mjs [docs/ui/tokens.json] [--format css|js] [--out file]
 *   css: khối @theme (Tailwind v4, cấu hình trong CSS)      js: theme.extend (Tailwind v3, tailwind.config)
 * Hãy chọn định dạng theo phiên bản Tailwind mà T-001 cài.
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const file = args.find((a, i) => !a.startsWith('--') && !['--format', '--out'].includes(args[i - 1])) || 'docs/ui/tokens.json';
const format = opt('format', 'css');
const out = opt('out', null);

let t;
try { t = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`Không đọc được ${file}: ${e.message}`); process.exit(2); }
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

let text;
if (format === 'css') {
  const L = ['/* Sinh tự động từ docs/ui/tokens.json. Không sửa tay, hãy sửa tokens.json rồi sinh lại. */', '@theme {'];
  for (const [k, v] of Object.entries(t.colors || {})) L.push(`  --color-${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(t.fonts || {})) L.push(`  --font-${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(t.radius || {})) L.push(`  --radius-${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(t.fontSize || {})) L.push(`  --text-${kebab(k)}: ${v};`);
  L.push('}');
  text = L.join('\n') + '\n';
} else if (format === 'js') {
  const theme = {
    colors: Object.fromEntries(Object.entries(t.colors || {}).map(([k, v]) => [kebab(k), v])),
    fontFamily: Object.fromEntries(Object.entries(t.fonts || {}).map(([k, v]) => [kebab(k), v.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))])),
    borderRadius: Object.fromEntries(Object.entries(t.radius || {}).map(([k, v]) => [kebab(k), v])),
    fontSize: Object.fromEntries(Object.entries(t.fontSize || {}).map(([k, v]) => [kebab(k), v])),
  };
  text = `// Sinh tự động từ docs/ui/tokens.json. Không sửa tay.\nmodule.exports = ${JSON.stringify({ theme: { extend: theme } }, null, 2)};\n`;
} else { console.error('--format phải là css hoặc js'); process.exit(1); }

if (out) { fs.writeFileSync(out, text); console.log(`Đã ghi ${out}`); } else process.stdout.write(text);
