#!/usr/bin/env node
// Kiểm thử sprint_report.mjs và nightly.sh:  node scripts/selftest.mjs   (chạy trong repo có tasks.json)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.join(HERE, 'sprint_report.mjs');
const NIGHTLY = path.join(HERE, 'nightly.sh');
const realTasks = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'tasks.json'), 'utf8'));

let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? '  ✔' : '  ✖'} ${msg}`); if (!cond) failed++; };

function fresh({ done = 0, blocked = [], state = {}, cap = 60, notes = [], init = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint-test-'));
  const tasks = realTasks.map((t, i) => ({ ...t, status: i < done ? 'done' : 'todo', depends_on: t.depends_on }));
  for (const id of blocked) { const t = tasks.find((x) => x.id === id); t.status = 'blocked'; t.note = 'Hết 3 vòng sửa (giả lập)'; }
  fs.writeFileSync(path.join(dir, 'tasks.json'), JSON.stringify(tasks));
  fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'agents/config.json'), JSON.stringify({ maxTotalUsd: cap }));
  fs.writeFileSync(path.join(dir, 'logs/state.json'), JSON.stringify({ totalUsd: 0, pendingReview: null, ...state }));
  notes.forEach((n, i) => fs.writeFileSync(path.join(dir, `reports/T-00${i + 1}.json`), JSON.stringify({ notes: [n] })));
  if (init) run(dir, ['init', '--start', '2026-10-01']);
  return dir;
}
const run = (dir, args) => spawnSync('node', [REPORT, ...args], { cwd: dir, encoding: 'utf8' });
const rep = (dir, day, extra = []) => JSON.parse(run(dir, ['report', '--day', String(day), '--json', ...extra]).stdout);

console.log('1) chưa init');
let d = fresh({ init: false });
let r = run(d, ['report', '--day', '3']);
check(r.status === 1 && r.stderr.includes('init'), 'báo lỗi rõ ràng và chỉ cách init');

console.log('2) đúng tiến độ, có milestone chờ duyệt (ngày 4, xong M0+M1 = 6 task)');
d = fresh({ done: 6, state: { totalUsd: 12, pendingReview: 'M1' } });
r = rep(d, 4);
check(r.status === 'on_track' && r.delta === 0, `on_track, chênh 0 (${r.status}, ${r.delta})`);
check(r.actions[0].includes('approve M1'), 'hành động đầu tiên là duyệt M1');
check(r.suggestion.open && r.suggestion.trigger === 'milestone', 'cửa sổ gợi ý mở, kích hoạt bởi milestone');
check(Math.abs(r.budget.perTask - 2) < 1e-9 && Math.round(r.budget.projected) === 38, 'dự phóng chi: 12$ / 6 task × 19 = 38$');
const txt = run(d, ['report', '--day', '4', '--no-write']).stdout;
check(txt.includes('ĐÚNG TIẾN ĐỘ') && txt.includes('Duyệt milestone M1'), 'bản văn bản có trạng thái và việc cần làm');

console.log('3) trễ nặng (ngày 6, mới xong 3/10)');
d = fresh({ done: 3 });
r = rep(d, 6);
check(r.status === 'behind', `behind (${r.status}, chênh ${r.delta})`);
check(r.cuts.recommended.length === 4, 'đề xuất 4 cắt scope');
d = fresh({ done: 14 }); // T-001..T-014 đã xong (gồm T-014, T-010, T-013) nhưng quá 14 ngày → behind
r = rep(d, 15);
const doneIds = new Set(realTasks.slice(0, 14).map((t) => t.id));
check(r.status === 'behind' && r.cuts.recommended.length > 0 && r.cuts.recommended.every((c) => !doneIds.has(c.task)), 'chỉ đề xuất cắt task CHƯA chạy (cắt task đã xong không tiết kiệm gì)');
check(!r.suggestion.open && r.suggestion.reasonsClosed.some((x) => x.includes('behind')), 'cửa sổ gợi ý đóng khi đang trễ');

console.log('4) rủi ro vì task blocked');
d = fresh({ done: 8, blocked: ['T-009', 'T-010'] });
r = rep(d, 5);
check(r.status === 'at_risk', `at_risk vì 2 task blocked (${r.status})`);
check(r.blocked.length === 2 && r.actions.some((a) => a.includes('Triage T-009')), 'liệt kê triage cho từng task blocked');
check(!r.suggestion.open, 'đóng cửa sổ gợi ý');

console.log('4b) một task blocked nằm trên đường găng phải làm trạng thái ≥ at_risk');
d = fresh({ done: 7, blocked: ['T-008'] });
r = rep(d, 5);
const expectedStuck = ['T-010', 'T-012', 'T-013', 'T-014', 'T-015', 'T-016', 'T-017', 'T-018', 'T-019'];
check(r.status === 'at_risk', `at_risk dù chỉ 1 task blocked (${r.status})`);
check(JSON.stringify([...r.stuckDownstream].sort()) === JSON.stringify(expectedStuck), `liệt kê đúng 9 task bị kẹt: ${r.stuckDownstream.join(',')}`);
check(r.actions.some((a) => a.includes('9 task khác đang bị kẹt')), 'nhắc gỡ blocked trước');
check(r.cuts.recommended.length === 0, 'rủi ro chỉ do blocked (không trễ lịch) thì KHÔNG đề xuất cắt scope');

console.log('5) ngân sách');
d = fresh({ done: 5, state: { totalUsd: 50 }, cap: 60 });
r = rep(d, 5);
check(r.budget.projectedOverCap && r.actions.some((a) => a.includes('vượt trần')), 'cảnh báo dự phóng vượt trần, không tự tăng trần');
d = fresh({ done: 7, state: { totalUsd: 21.4 }, cap: 60 }); // dự phóng ~58$ / 60$
r = rep(d, 5);
check(!r.budget.projectedOverCap && r.budget.nearCap && r.actions.some((a) => a.includes('sát trần')), 'cảnh báo sát trần khi dự phóng > 90% trần dù chưa vượt');
d = fresh({ done: 0 });
r = rep(d, 1);
check(r.budget.enoughData === false, 'chưa có task xong thì báo chưa đủ dữ liệu, không bịa dự phóng');

console.log('6) đóng băng tính năng và ngày 1');
d = fresh({ done: 18 });
r = rep(d, 12);
check(!r.suggestion.open && r.suggestion.reasonsClosed.some((x) => x.includes('đóng băng')), 'sau ngày 11 không gợi ý thêm tính năng');
d = fresh({ done: 1 });
r = rep(d, 1);
check(!r.suggestion.open && r.suggestion.reasonsClosed.some((x) => x.includes('ngày 1')), 'ngày 1 chưa gợi ý (chưa có dữ liệu thật)');

console.log('7) đi trước kế hoạch có độ đệm');
d = fresh({ done: 8 });
r = rep(d, 4);
check(r.delta === 2 && r.suggestion.open && r.suggestion.slackTasks === 3 && r.suggestion.trigger === 'ahead', 'trước 2 task → độ đệm 3, kích hoạt "ahead"');

console.log('8) ghi chú Verifier và mark-cut');
d = fresh({ done: 3, notes: ['Nút gửi chưa có trạng thái tải', 'Chưa có tiếng Việt cho lỗi 500'] });
r = rep(d, 6);
check(r.notes.length === 2, 'gom ghi chú của Verifier từ reports/');
const first = r.cuts.recommended[0].id;
check(run(d, ['mark-cut', first]).status === 0, `mark-cut ${first} thành công`);
r = rep(d, 6);
check(!r.cuts.recommended.some((c) => c.id === first) && r.cuts.appliedIds.includes(first), 'cắt đã áp dụng không được đề xuất lại');
check(run(d, ['mark-cut', 'C-99']).status === 1, 'mark-cut với id sai bị từ chối');

console.log('9) quá hạn milestone và quá 14 ngày');
d = fresh({ done: 4 });
r = rep(d, 8);
check(r.milestones.find((m) => m.id === 'M2').overdueDays === 2, 'M2 hạn ngày 6, đến ngày 8 trễ 2 ngày');
r = rep(d, 15);
check(r.overtime && r.status === 'behind' && r.day === 14, 'quá 14 ngày và chưa xong → behind, kẹp ở ngày 14');

console.log('10) báo cáo được ghi vào logs/sprint/');
d = fresh({ done: 2 });
run(d, ['report', '--day', '2']);
check(fs.existsSync(path.join(d, 'logs/sprint/day-02.md')), 'tạo logs/sprint/day-02.md');

console.log('11) nightly.sh');
d = fresh({ done: 0 });
fs.writeFileSync(path.join(d, 'agents/run.mjs'), `
const a = process.argv.slice(2).join(' ');
console.log('STUB run.mjs ' + a);
if (a === 'doctor') process.exit(process.env.STUB_DOCTOR_FAIL ? 1 : 0);
if (a.startsWith('run')) process.exit(Number(process.env.STUB_RUN_RC || 0));
`);
let n = spawnSync('bash', [NIGHTLY], { cwd: d, encoding: 'utf8', env: { ...process.env, MAX_TASKS: '2' } });
check(n.status === 0 && n.stdout.includes('run --max-tasks 2') && n.stdout.includes('Sprint ngày'), 'chạy đủ doctor → run → báo cáo, truyền MAX_TASKS');
check(!fs.existsSync(path.join(d, 'logs/.nightly.lock')), 'khoá được giải phóng sau khi chạy');
n = spawnSync('bash', [NIGHTLY], { cwd: d, encoding: 'utf8', env: { ...process.env, STUB_DOCTOR_FAIL: '1' } });
check(n.status === 1 && !n.stdout.includes('STUB run.mjs run'), 'doctor thất bại thì thoát mã 1 và không chạy agent');
n = spawnSync('bash', [NIGHTLY], { cwd: d, encoding: 'utf8', env: { ...process.env, STUB_RUN_RC: '2' } });
check(n.status === 2, 'chuyển tiếp mã thoát 2 (chạm trần ngân sách)');
fs.mkdirSync(path.join(d, 'logs/.nightly.lock'));
n = spawnSync('bash', [NIGHTLY], { cwd: d, encoding: 'utf8' });
check(n.status === 3 && n.stdout.includes('Đang có lượt chạy khác'), 'có khoá sẵn thì thoát mã 3');
check(fs.existsSync(path.join(d, 'logs/.nightly.lock')), 'không xoá khoá của lượt khác');

console.log(failed ? `\n✖ ${failed} kiểm tra thất bại` : '\n✔ Tất cả kiểm tra đạt');
process.exit(failed ? 1 : 0);
