#!/usr/bin/env node
// Kiểm thử phần tĩnh của skill (không cần npm install):  node scripts/selftest.mjs
// Phần chạy thật của khung (typecheck, 37 test, build) chạy bằng `npm run check` trong thư mục prototype.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..');
const TEMPLATE = path.join(SKILL, 'assets', 'template');
const REVIEW = path.resolve(SKILL, '..', 'level-down-ui-review');
const node = (args, opts = {}) => spawnSync('node', args, { encoding: 'utf8', ...opts });

let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? '  ✔' : '  ✖'} ${msg}`); if (!cond) failed++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proto-skill-'));

console.log('1) scaffold');
const dest = path.join(tmp, 'prototype');
let r = node([path.join(HERE, 'scaffold.mjs'), dest]);
check(r.status === 0 && fs.existsSync(path.join(dest, 'package.json')) && fs.existsSync(path.join(dest, 'src/components/Gumi.tsx')), 'sao chép khung thành công');
check(!fs.existsSync(path.join(dest, 'node_modules')) && !fs.existsSync(path.join(dest, 'dist')), 'không sao chép node_modules hay dist');
r = node([path.join(HERE, 'scaffold.mjs'), dest]);
check(r.status === 1 && r.stderr.includes('--force'), 'từ chối ghi đè thư mục đã có nội dung');
check(node([path.join(HERE, 'scaffold.mjs'), dest, '--force']).status === 0, '--force cho phép ghi đè');

console.log('2) hệ thiết kế');
const gen = path.join(dest, 'scripts/gen-theme.mjs');
const before = fs.readFileSync(path.join(dest, 'src/theme.css'), 'utf8');
node([gen], { cwd: dest });
const after = fs.readFileSync(path.join(dest, 'src/theme.css'), 'utf8');
check(before === after, 'src/theme.css khớp đúng với tokens.json (không bị sửa tay lệch)');
const tokens = JSON.parse(fs.readFileSync(path.join(dest, 'tokens.json'), 'utf8'));
const cssVars = [...after.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]);
check(Object.keys(tokens.colors).length === cssVars.length, `mọi ${cssVars.length} màu trong tokens.json đều có biến CSS`);
if (fs.existsSync(path.join(REVIEW, 'scripts/check_contrast.mjs'))) {
  r = node([path.join(REVIEW, 'scripts/check_contrast.mjs'), path.join(dest, 'tokens.json')]);
  check(r.status === 0, 'mọi cặp màu trong tokens.json đạt WCAG (dùng check_contrast của skill review)');
} else console.log('  ℹ bỏ qua: chưa có skill level-down-ui-review để kiểm tương phản');

console.log('3) kiểm tra chuyển động (check-motion.mjs)');
const motion = path.join(dest, 'scripts/check-motion.mjs');
const cssDir = path.join(tmp, 'css');
fs.mkdirSync(cssDir);
const okCss = `@keyframes a{0%{transform:scale(1)}100%{opacity:0}} .x{animation:a 1s infinite}
@media (prefers-reduced-motion: reduce){ .x{animation:none!important} }`;
const run = (css) => { fs.writeFileSync(path.join(cssDir, 'a.css'), css); return node([motion, cssDir]); };
r = run(okCss);
check(r.status === 0, 'CSS hợp lệ (chỉ transform/opacity, có giảm chuyển động) → đạt');
r = run(okCss.replace('opacity:0', 'box-shadow:0 0 9px red'));
check(r.status === 1 && r.stdout.includes('box-shadow'), 'animate box-shadow → vi phạm');
r = run(okCss.replace('transform:scale(1)', 'width:10px'));
check(r.status === 1 && r.stdout.includes('"width"'), 'animate width (gây giật bố cục) → vi phạm');
r = run(okCss.replace(/@media[\s\S]*$/, ''));
check(r.status === 1 && r.stdout.includes('prefers-reduced-motion'), 'thiếu khối giảm chuyển động → vi phạm');
r = run(okCss.replace('animation:none!important', 'color:red'));
check(r.status === 1 && r.stdout.includes('animation: none'), 'khối giảm chuyển động nhưng không tắt hoạt ảnh → vi phạm');
r = run(okCss + ' .y{transition: all .2s}');
check(r.status === 1 && r.stdout.includes('transition'), 'transition: all → vi phạm');
r = run(okCss + ' /* @keyframes b{0%{width:1px}} */');
check(r.status === 0, 'chú thích CSS không bị tính nhầm');
r = node([motion, path.join(dest, 'src')]);
check(r.status === 0 && r.stdout.includes('11 @keyframes'), 'CSS của khung (11 @keyframes của Gumi) đạt');

console.log('4) danh sách ảnh chụp (capture.mjs --list)');
r = node([path.join(dest, 'scripts/capture.mjs'), '--list', '--motion']);
check(r.status === 0 && /27 ảnh tĩnh/.test(r.stdout) && /6 chuỗi chuyển động/.test(r.stdout), '27 ảnh tĩnh và 6 chuỗi chuyển động');
const listed = r.stdout;

console.log('5) khớp với danh sách màn bắt buộc của skill review');
const cov = JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'ui-coverage.json'), 'utf8'));
const reqFile = path.join(REVIEW, 'references/required-screens.json');
if (fs.existsSync(reqFile)) {
  const req = JSON.parse(fs.readFileSync(reqFile, 'utf8'));
  const reqBy = new Map([...req.screens, ...req.components].map((x) => [x.id, x]));
  const typos = [];
  for (const item of [...cov.screens, ...cov.components]) {
    const spec = reqBy.get(item.id);
    if (!spec) { typos.push(`${item.id} không có trong required-screens.json`); continue; }
    const legal = new Set([...spec.states, ...(spec.optionalStates || [])]);
    for (const s of item.states) if (!legal.has(s)) typos.push(`${item.id}: trạng thái lạ "${s}"`);
  }
  check(typos.length === 0, `ui-coverage.json không có mã hay tên trạng thái sai${typos.length ? ': ' + typos.join('; ') : ''}`);
  const s05 = req.screens.find((s) => s.id === 'S05').states;
  check(s05.every((s) => listed.includes(`dashboard-${s}`)), 'mỗi trạng thái dashboard bắt buộc (8) đều có ảnh chụp tương ứng');
  const s12 = req.screens.find((s) => s.id === 'S12').states;
  check(s12.every((s) => listed.includes(`leaderboard-${s}`)), 'mỗi trạng thái bảng xếp hạng bắt buộc (5) đều có ảnh chụp');
  const s06 = req.screens.find((s) => s.id === 'S06').states.filter((s) => s !== 'default');
  check(s06.every((s) => listed.includes(`checkin-${s}`)), 'mỗi trạng thái check-in bắt buộc đều có ảnh chụp');
  r = node([path.join(REVIEW, 'scripts/check_coverage.mjs'), path.join(TEMPLATE, 'ui-coverage.json'), '--json']);
  const j = JSON.parse(r.stdout);
  const gaps = [...j.missingItems.map((x) => x.id), ...j.missingStates.map((x) => x.id)];
  check(j.covered === 8 && j.missingItems.length === 9, `độ phủ thật của khung: ${j.covered}/${j.total} mục; thiếu hẳn ${j.missingItems.length} màn (${gaps.join(', ')})`);
} else console.log('  ℹ bỏ qua: chưa có skill level-down-ui-review');

console.log('6) khung không kéo phụ thuộc ngoài danh sách');
const pkg = JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'package.json'), 'utf8'));
const ALLOWED_RUNTIME = ['@fontsource/be-vietnam-pro', 'react', 'react-dom', 'react-router-dom'];
check(JSON.stringify(Object.keys(pkg.dependencies).sort()) === JSON.stringify(ALLOWED_RUNTIME), 'thư viện chạy thật đúng danh sách được phép (không có Lottie, framer-motion, thư viện UI…)');
const src = fs.readdirSync(path.join(TEMPLATE, 'src'), { recursive: true }).filter((f) => /\.(tsx?|css)$/.test(f)).map((f) => fs.readFileSync(path.join(TEMPLATE, 'src', f), 'utf8')).join('\n');
check(!/(fetch\(|XMLHttpRequest|localStorage|sessionStorage|https?:\/\/(?!www\.w3\.org))/.test(src.replace(/\/\/.*$/gm, '')), 'mã nguồn không gọi mạng, không dùng localStorage, không chứa URL ngoài');

console.log(failed ? `\n✖ ${failed} kiểm tra thất bại` : '\n✔ Tất cả kiểm tra đạt');
process.exit(failed ? 1 : 0);
