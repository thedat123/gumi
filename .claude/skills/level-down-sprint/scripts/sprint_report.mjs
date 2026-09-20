#!/usr/bin/env node
/**
 * Báo cáo sprint 14 ngày. Chạy từ thư mục gốc repo. Không có dependency.
 *
 *   node sprint_report.mjs init --start 2026-09-21 [--force]
 *   node sprint_report.mjs [report] [--day N] [--today YYYY-MM-DD] [--json] [--no-write]
 *   node sprint_report.mjs mark-cut C-03
 *
 * Đọc: tasks.json, logs/state.json, agents/config.json, reports/*.json,
 *      references/schedule.json, references/scope-cuts.json (cùng skill).
 * Ghi: logs/sprint.json (ngày bắt đầu, các cắt đã áp dụng), logs/sprint/day-XX.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const REF = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'references');
const P = {
  tasks: path.join(ROOT, 'tasks.json'),
  state: path.join(ROOT, 'logs/state.json'),
  sprint: path.join(ROOT, 'logs/sprint.json'),
  config: path.join(ROOT, 'agents/config.json'),
  reports: path.join(ROOT, 'reports'),
  out: path.join(ROOT, 'logs/sprint'),
};

const readJSON = (f, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; }
};
const ictDate = (d = new Date()) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
const dayNumber = (start, today) => Math.round((Date.parse(today) - Date.parse(start)) / 864e5) + 1;
const msPrefix = (m) => String(m).split(' ')[0];

function parseArgs(argv) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const nxt = argv[i + 1];
      if (nxt && !nxt.startsWith('--')) { flags[a.slice(2)] = nxt; i++; } else flags[a.slice(2)] = true;
    } else pos.push(a);
  }
  return { pos, flags };
}

function analyze({ today, dayOverride }) {
  const sched = readJSON(path.join(REF, 'schedule.json'));
  const cutsDef = readJSON(path.join(REF, 'scope-cuts.json'));
  const tasks = readJSON(P.tasks);
  const sprint = readJSON(P.sprint);
  if (!tasks) throw new Error('Không đọc được tasks.json (chạy từ thư mục gốc repo?)');
  if (!sprint) throw new Error('Chưa khởi tạo sprint. Chạy: node sprint_report.mjs init --start YYYY-MM-DD');

  const state = readJSON(P.state, { totalUsd: 0, pendingReview: null });
  const config = readJSON(P.config, {});

  const rawDay = dayOverride ?? dayNumber(sprint.start, today);
  const day = Math.min(Math.max(rawDay, 1), sched.totalDays);
  const beforeStart = rawDay < 1;
  const overtime = rawDay > sched.totalDays;
  const plan = sched.days[day - 1];

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const count = (s) => tasks.filter((t) => t.status === s).length;
  const done = count('done'), blocked = count('blocked'), todo = count('todo');
  const total = tasks.length;
  const expected = Math.min(plan.expectedDone, total);
  const delta = done - expected;

  // milestone
  const msMap = new Map();
  for (const t of tasks) {
    const k = msPrefix(t.milestone);
    if (!msMap.has(k)) msMap.set(k, { id: k, name: t.milestone, done: 0, total: 0 });
    const m = msMap.get(k);
    m.total++;
    if (t.status === 'done') m.done++;
  }
  const milestones = [...msMap.values()].map((m) => {
    const deadline = sched.milestoneDeadlines[m.id] ?? null;
    const complete = m.done === m.total;
    const overdueDays = deadline && !complete ? Math.max(0, rawDay - deadline) : 0;
    return { ...m, deadline, complete, overdueDays };
  });
  const maxOverdue = Math.max(0, ...milestones.map((m) => m.overdueDays));

  // task todo bị kẹt vì (gián tiếp) phụ thuộc vào task blocked: orchestrator sẽ không bao giờ chạy chúng
  const stuck = new Set();
  const blockedIds = new Set(tasks.filter((t) => t.status === 'blocked').map((t) => t.id));
  const isStuck = (t, seen = new Set()) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return (t.depends_on || []).some((d) => blockedIds.has(d) || (byId.get(d)?.status === 'todo' && isStuck(byId.get(d), seen)));
  };
  for (const t of tasks) if (t.status === 'todo' && isStuck(t)) stuck.add(t.id);

  // trạng thái tổng
  let status = 'on_track';
  if (delta <= -2 || blocked >= 2 || stuck.size >= 1 || maxOverdue >= 1) status = 'at_risk';
  if (delta <= -4 || maxOverdue >= 2 || (overtime && done < total)) status = 'behind';

  // ngân sách
  const cap = config.maxTotalUsd ?? null;
  const spent = Number(state.totalUsd || 0);
  const perTask = done > 0 ? spent / done : null;
  const projected = perTask !== null ? spent + perTask * (total - done) : null;
  const budget = {
    spent, cap, perTask, projected,
    projectedOverCap: cap !== null && projected !== null && projected > cap,
    nearCap: cap !== null && (spent > 0.8 * cap || (projected !== null && projected > 0.9 * cap)),
    enoughData: done > 0,
  };

  // task
  const eligible = tasks.filter((t) => t.status === 'todo' && (t.depends_on || []).every((d) => byId.get(d)?.status === 'done')).map((t) => t.id);
  const blockedList = tasks.filter((t) => t.status === 'blocked').map((t) => ({ id: t.id, title: t.title, attempts: t.attempts || 0, note: t.note || '' }));
  const retried = tasks.filter((t) => t.status === 'done' && (t.attempts || 0) >= 2).map((t) => t.id);

  // ghi chú của verifier
  const notes = [];
  if (fs.existsSync(P.reports)) {
    for (const f of fs.readdirSync(P.reports).filter((x) => x.endsWith('.json')).sort()) {
      const r = readJSON(path.join(P.reports, f));
      for (const n of Array.isArray(r?.notes) ? r.notes : []) notes.push({ task: f.replace('.json', ''), note: String(n) });
    }
  }

  // cắt scope
  const applied = sprint.appliedCuts || [];
  const cutsAvailable = cutsDef.cuts.filter((c) => !applied.includes(c.id) && byId.get(c.task)?.status === 'todo');
  // Cắt scope chỉ giải quyết rủi ro về LỊCH. Nếu rủi ro chỉ do task blocked thì cắt không giúp gì: phải gỡ blocked.
  const scheduleRisk = delta <= -2 || maxOverdue >= 1;
  const wantCuts = status === 'behind' ? 4 : status === 'at_risk' && scheduleRisk ? 2 : 0;
  const cutsRecommended = cutsAvailable.slice(0, wantCuts);

  // cửa sổ gợi ý
  const reasonsClosed = [];
  if (beforeStart) reasonsClosed.push('sprint chưa bắt đầu');
  if (day < 2) reasonsClosed.push('chưa có dữ liệu chi phí/tốc độ thật (ngày 1)');
  if (day > sched.freezeDay || overtime) reasonsClosed.push(`đã qua ngày đóng băng tính năng (ngày ${sched.freezeDay})`);
  if (status !== 'on_track') reasonsClosed.push(`trạng thái ${status}`);
  if (blocked > 0) reasonsClosed.push(`đang có ${blocked} task blocked`);
  if (budget.projectedOverCap || budget.nearCap) reasonsClosed.push('ngân sách sát trần');
  const slackTasks = Math.max(0, delta) + (day <= sched.freezeDay - 1 ? sched.bufferTasks : 0);
  if (slackTasks < 1) reasonsClosed.push('không còn độ đệm');
  const suggestion = {
    open: reasonsClosed.length === 0,
    reasonsClosed,
    slackTasks,
    trigger: state.pendingReview ? 'milestone' : delta >= 1 ? 'ahead' : plan.review ? 'review-day' : null,
  };

  // hành động
  const actions = [];
  if (state.pendingReview) actions.push(`Duyệt milestone ${state.pendingReview}: chạy checklist ở references/schedule-14-days.md rồi \`node agents/run.mjs approve ${state.pendingReview}\` nếu ổn.`);
  for (const b of blockedList) actions.push(`Triage ${b.id} (blocked${b.note ? `: ${b.note.length > 90 ? b.note.slice(0, 90) + '…' : b.note}` : ''}).`);
  if (stuck.size) actions.push(`${stuck.size} task khác đang bị kẹt vì phụ thuộc vào task blocked: gỡ blocked trước, nếu không agent sẽ không chạy được chúng.`);
  if (cutsRecommended.length) actions.push(`Cân nhắc cắt scope: ${cutsRecommended.map((c) => c.id).join(', ')} (ước tính tiết kiệm ${cutsRecommended.reduce((s, c) => s + c.saves, 0).toFixed(1)} task-ngày).`);
  if (budget.projectedOverCap) actions.push(`Dự phóng chi ${budget.projected.toFixed(0)}$ vượt trần ${cap}$: báo người dùng, không tự tăng trần.`);
  else if (budget.nearCap) actions.push(`Chi phí sát trần (đã chi ${spent.toFixed(0)}$, dự phóng ${budget.projected !== null ? budget.projected.toFixed(0) + '$' : 'chưa có'} / trần ${cap}$): báo người dùng.`);
  if (suggestion.open && (suggestion.trigger === 'milestone' || suggestion.trigger === 'review-day' || suggestion.trigger === 'ahead')) actions.push('Cửa sổ gợi ý đang mở: đưa tối đa 3 gợi ý theo references/suggestion-template.md.');
  if (!state.pendingReview && eligible.length && !blockedList.length) actions.push('Không có gì cản: tiếp tục chạy agent (`node agents/run.mjs run --max-tasks 3` hoặc để autopilot).');
  if (!actions.length) actions.push(done === total ? 'Mọi task đã xong: chuyển sang kiểm thử tay và chốt launch.' : 'Không có việc cần làm ngay.');

  return {
    generatedAt: new Date().toISOString(), today, day, rawDay, beforeStart, overtime, totalDays: sched.totalDays,
    focus: plan.focus, status, counts: { done, blocked, todo, total }, expected, delta,
    milestones, pendingReview: state.pendingReview || null, budget, eligible, blocked: blockedList, stuckDownstream: [...stuck], retried, notes,
    cuts: { recommended: cutsRecommended, appliedIds: applied }, suggestion, actions,
  };
}

const ICON = { on_track: '🟢', at_risk: '🟡', behind: '🔴' };
const LABEL = { on_track: 'ĐÚNG TIẾN ĐỘ', at_risk: 'CÓ RỦI RO', behind: 'ĐANG TRỄ' };

function render(r) {
  const L = [];
  const sign = r.delta > 0 ? `+${r.delta}` : `${r.delta}`;
  L.push(`# Sprint ngày ${r.day}/${r.totalDays} — ${ICON[r.status]} ${LABEL[r.status]}`);
  if (r.beforeStart) L.push('_Sprint chưa bắt đầu; đang hiển thị ngày 1._');
  if (r.overtime) L.push('_Đã quá 14 ngày._');
  L.push(`Trọng tâm hôm nay: ${r.focus}`, '');
  L.push(`- Task xong: **${r.counts.done}/${r.counts.total}** (kế hoạch ${r.expected}, chênh ${sign}) · blocked ${r.counts.blocked} · còn ${r.counts.todo}`);
  const b = r.budget;
  L.push(`- Chi phí: $${b.spent.toFixed(2)}${b.cap ? ` / trần $${b.cap}` : ''}` +
    (b.enoughData ? ` · trung bình $${b.perTask.toFixed(2)}/task · dự phóng cả dự án ~$${b.projected.toFixed(0)}${b.projectedOverCap ? ' ⚠️ vượt trần' : ''}` : ' · chưa đủ dữ liệu để dự phóng (chưa có task nào xong)'));
  if (r.pendingReview) L.push(`- ⏸ Đang chờ duyệt milestone **${r.pendingReview}**`);
  L.push('', '## Milestone');
  for (const m of r.milestones) {
    const st = m.complete ? '✔ xong' : m.overdueDays ? `⚠️ trễ ${m.overdueDays} ngày` : 'đang chạy/chưa tới';
    L.push(`- ${m.name}: ${m.done}/${m.total} · hạn ngày ${m.deadline ?? '?'} · ${st}`);
  }
  if (r.blocked.length) {
    L.push('', '## Task blocked');
    for (const t of r.blocked) L.push(`- ${t.id} ${t.title}${t.note ? `\n  ↳ ${t.note}` : ''}`);
    if (r.stuckDownstream.length) L.push(`- Kéo theo ${r.stuckDownstream.length} task đang kẹt: ${r.stuckDownstream.join(', ')}`);
  }
  if (r.retried.length) L.push('', `Task phải sửa ≥ 2 lần mới qua (dấu hiệu spec mơ hồ): ${r.retried.join(', ')}`);
  if (r.notes.length) {
    L.push('', '## Ghi chú của Verifier (không gây chặn; nguồn gợi ý)');
    for (const n of r.notes.slice(0, 10)) L.push(`- [${n.task}] ${n.note}`);
    if (r.notes.length > 10) L.push(`- … và ${r.notes.length - 10} ghi chú khác trong reports/`);
  }
  if (r.cuts.recommended.length) {
    L.push('', '## Đề xuất cắt scope (cần người dùng đồng ý)');
    for (const c of r.cuts.recommended) L.push(`- ${c.id} [${c.task}] ${c.title} — tiết kiệm ~${c.saves} task-ngày. ${c.how} Mất: ${c.cost}`);
  }
  L.push('', `## Gợi ý chức năng: cửa sổ ${r.suggestion.open ? 'MỞ' : 'ĐÓNG'}`);
  if (r.suggestion.open) L.push(`- Độ đệm còn ~${r.suggestion.slackTasks} task; kích hoạt bởi: ${r.suggestion.trigger ?? 'không có mốc cụ thể (chỉ gợi ý nếu người dùng hỏi)'}`);
  else L.push(`- Lý do đóng: ${r.suggestion.reasonsClosed.join('; ')}`);
  L.push('', '## Việc cần làm', ...r.actions.map((a, i) => `${i + 1}. ${a}`));
  return L.join('\n');
}

const { pos, flags } = parseArgs(process.argv.slice(2));
const cmd = pos[0] || 'report';

try {
  if (cmd === 'init') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(flags.start || ''))) throw new Error('Cần --start YYYY-MM-DD');
    if (fs.existsSync(P.sprint) && !flags.force) throw new Error('logs/sprint.json đã tồn tại (dùng --force để ghi đè)');
    fs.mkdirSync(path.dirname(P.sprint), { recursive: true });
    fs.writeFileSync(P.sprint, JSON.stringify({ start: flags.start, appliedCuts: [], createdAt: new Date().toISOString() }, null, 2));
    console.log(`Đã đặt ngày bắt đầu sprint: ${flags.start}`);
  } else if (cmd === 'mark-cut') {
    const sprint = readJSON(P.sprint);
    if (!sprint) throw new Error('Chưa init sprint');
    const id = pos[1];
    const known = readJSON(path.join(REF, 'scope-cuts.json')).cuts.map((c) => c.id);
    if (!known.includes(id)) throw new Error(`Không có cắt "${id}". Hợp lệ: ${known.join(', ')}`);
    if (!sprint.appliedCuts.includes(id)) sprint.appliedCuts.push(id);
    fs.writeFileSync(P.sprint, JSON.stringify(sprint, null, 2));
    console.log(`Đã ghi nhận cắt ${id}.`);
  } else if (cmd === 'report') {
    const r = analyze({ today: flags.today || ictDate(), dayOverride: flags.day ? Number(flags.day) : null });
    if (flags.json) console.log(JSON.stringify(r, null, 2));
    else {
      const text = render(r);
      console.log(text);
      if (!flags['no-write']) {
        fs.mkdirSync(P.out, { recursive: true });
        fs.writeFileSync(path.join(P.out, `day-${String(r.day).padStart(2, '0')}.md`), text + '\n');
      }
    }
  } else throw new Error(`Lệnh không hợp lệ: ${cmd}. Dùng: init | report | mark-cut`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
