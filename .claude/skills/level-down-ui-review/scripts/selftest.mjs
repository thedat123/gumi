#!/usr/bin/env node
// Kiểm thử 3 script của skill:  node scripts/selftest.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = (n) => path.join(HERE, n);
const req = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'references', 'required-screens.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-review-'));
const w = (name, obj) => { const f = path.join(tmp, name); fs.writeFileSync(f, typeof obj === 'string' ? obj : JSON.stringify(obj)); return f; };
const run = (script, args) => spawnSync('node', [S(script), ...args], { encoding: 'utf8' });

let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? '  ✔' : '  ✖'} ${msg}`); if (!cond) failed++; };

console.log('1) danh sách bắt buộc hợp lệ');
const ids = [...req.screens, ...req.components].map((x) => x.id);
check(new Set(ids).size === ids.length, 'mã màn/thành phần không trùng nhau');
check([...req.screens, ...req.components].every((x) => /^T-\d{3}[ab]?$/.test(x.task)), 'mỗi mục đều gắn với một task hợp lệ');
const tasksFile = path.resolve(HERE, '../../../../tasks.json');
if (fs.existsSync(tasksFile)) {
  const known = new Set(JSON.parse(fs.readFileSync(tasksFile, 'utf8')).map((t) => t.id));
  const unknown = [...new Set([...req.screens, ...req.components].map((x) => x.task))].filter((t) => !known.has(t));
  console.log(`  ℹ task chưa có trong tasks.json (sẽ thêm ở bản cập nhật repo): ${unknown.join(', ') || 'không'}`);
}

console.log('2) check_contrast');
const t1 = w('tokens1.json', {
  colors: { white: '#FFFFFF', black: '#000000', grey777: '#777777', grey767: '#767676', orange: '#FF7A59', short: '#fff', shortDark: '#000' },
  pairs: [
    { fg: 'black', bg: 'white', usage: 'body' },
    { fg: 'grey777', bg: 'white', usage: 'body' },
    { fg: 'grey767', bg: 'white', usage: 'body' },
    { fg: 'grey777', bg: 'white', usage: 'large' },
    { fg: 'short', bg: 'shortDark', usage: 'body' },
  ],
});
let r = run('check_contrast.mjs', [t1, '--json']);
const j = JSON.parse(r.stdout);
const by = (fg, usage) => j.rows.find((x) => x.fg === fg && x.usage === usage);
check(Math.abs(by('black', 'body').ratio - 21) < 0.01, 'đen trên trắng = 21:1');
check(by('grey777', 'body').pass === false && by('grey777', 'body').ratio === 4.48, '#777 trên trắng = 4.48:1 KHÔNG đạt chữ thường (ngưỡng 4.5)');
check(by('grey767', 'body').pass === true, '#767676 trên trắng đạt (biên 4.54:1)');
check(by('grey777', 'large').pass === true, 'cùng cặp #777 đạt với chữ lớn (ngưỡng 3)');
check(Math.abs(by('short', 'body').ratio - 21) < 0.01, 'hỗ trợ hex 3 ký tự');
check(r.status === 1, 'thoát mã 1 khi có cặp không đạt');
const t2 = w('tokens2.json', { colors: { a: '#000', b: '#fff' }, pairs: [{ fg: 'a', bg: 'b' }] });
check(run('check_contrast.mjs', [t2]).status === 0, 'thoát mã 0 khi mọi cặp đạt');
const t3 = w('tokens3.json', { colors: { a: 'rgba(0,0,0,.5)', b: '#fff' }, pairs: [{ fg: 'a', bg: 'b' }, { fg: 'zzz', bg: 'b' }] });
r = run('check_contrast.mjs', [t3]);
check(r.status === 1 && r.stdout.includes('không hợp lệ') && r.stdout.includes('thiếu màu zzz'), 'màu không hex đặc và khoá thiếu bị báo lỗi thay vì bỏ qua');

console.log('3) check_coverage');
const fullScreens = req.screens.filter((s) => s.required).map((s) => ({ id: s.id, states: [...s.states] }));
const fullComps = req.components.map((c) => ({ id: c.id, states: [...c.states] }));
let f = w('full.json', { screens: fullScreens, components: fullComps });
r = run('check_coverage.mjs', [f]);
check(r.status === 0 && r.stdout.includes('Đủ mọi màn'), 'thiết kế đủ mọi thứ → thoát 0');

const missingScreen = { screens: fullScreens.filter((s) => s.id !== 'S13'), components: fullComps };
r = run('check_coverage.mjs', [w('m1.json', missingScreen), '--json']);
let jj = JSON.parse(r.stdout);
check(r.status === 1 && jj.missingItems.some((x) => x.id === 'S13' && x.task === 'T-018b'), 'thiếu màn admin S13 → báo thiếu và chỉ ra task T-018b');

const missingState = { screens: fullScreens.map((s) => (s.id === 'S05' ? { ...s, states: s.states.filter((x) => x !== 'dying' && x !== 'rejected_day') } : s)), components: fullComps };
r = run('check_coverage.mjs', [w('m2.json', missingState), '--json']);
jj = JSON.parse(r.stdout);
const s05 = jj.missingStates.find((x) => x.id === 'S05');
check(r.status === 1 && s05 && s05.missing.join() === 'dying,rejected_day', 'dashboard thiếu trạng thái hấp hối và ảnh bị gỡ → báo đúng hai trạng thái');

const extra = { screens: [...fullScreens, { id: 'S99', name: 'Cửa hàng vật phẩm', states: ['default'], evidence: '12-shop.png' }], components: fullComps };
r = run('check_coverage.mjs', [w('m3.json', extra), '--json']);
jj = JSON.parse(r.stdout);
check(r.status === 0 && jj.extraItems.some((x) => x.id === 'S99'), 'màn ngoài danh sách được liệt kê để quyết định phạm vi (không chặn)');

const noOptional = { screens: fullScreens.filter((s) => s.id !== 'S16'), components: fullComps };
check(run('check_coverage.mjs', [w('m4.json', noOptional)]).status === 0, 'màn không bắt buộc (S16) vắng mặt không bị coi là lỗi');
check(run('check_coverage.mjs', [path.join(tmp, 'khong-ton-tai.json')]).status === 2, 'file không tồn tại → thoát mã 2');

console.log('4) tokens_to_tailwind');
const tk = w('tk.json', { colors: { primary: '#FF7A59', onPrimary: '#fff' }, fonts: { sans: "'Be Vietnam Pro', system-ui, sans-serif" }, radius: { card: '16px' }, fontSize: { body: '16px' } });
let css = run('tokens_to_tailwind.mjs', [tk]).stdout;
check(css.includes('@theme {') && css.includes('--color-primary: #FF7A59;') && css.includes('--color-on-primary: #fff;') && css.includes('--radius-card: 16px;') && css.includes('--font-sans:'), 'định dạng CSS (Tailwind v4): có @theme, biến màu, bo góc, font; camelCase → kebab-case');
const js = run('tokens_to_tailwind.mjs', [tk, '--format', 'js']).stdout;
const mod = { exports: {} };
new Function('module', js)(mod);
check(mod.exports.theme.extend.colors['on-primary'] === '#fff' && mod.exports.theme.extend.fontFamily.sans[0] === 'Be Vietnam Pro', 'định dạng JS (Tailwind v3) là module hợp lệ, tách danh sách font đúng');
const outFile = path.join(tmp, 'out.css');
run('tokens_to_tailwind.mjs', [tk, '--out', outFile]);
check(fs.existsSync(outFile) && fs.readFileSync(outFile, 'utf8').includes('@theme'), '--out ghi ra file');
check(run('tokens_to_tailwind.mjs', [tk, '--format', 'xml']).status === 1, 'định dạng lạ bị từ chối');

console.log(failed ? `\n✖ ${failed} kiểm tra thất bại` : '\n✔ Tất cả kiểm tra đạt');
process.exit(failed ? 1 : 0);
