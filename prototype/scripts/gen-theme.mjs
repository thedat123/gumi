#!/usr/bin/env node
// Sinh src/theme.css (Tailwind v4 @theme) từ tokens.json.  npm run tokens
import fs from 'node:fs';
const t = JSON.parse(fs.readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const L = ['/* Sinh tự động từ tokens.json bằng `npm run tokens`. Không sửa tay. */', '@theme {'];
for (const [k, v] of Object.entries(t.colors)) L.push(`  --color-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(t.fonts)) L.push(`  --font-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(t.radius)) L.push(`  --radius-${kebab(k)}: ${v};`);
for (const [k, v] of Object.entries(t.fontSize)) L.push(`  --text-${kebab(k)}: ${v};`);
L.push('}');
fs.writeFileSync(new URL('../src/theme.css', import.meta.url), L.join('\n') + '\n');
console.log('Đã ghi src/theme.css');
