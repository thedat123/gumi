#!/usr/bin/env node
/**
 * So kiểm kê thiết kế (docs/ui/screens.json) với danh sách bắt buộc (references/required-screens.json).
 *   node check_coverage.mjs [đường/dẫn/screens.json] [--json]
 * screens.json do Claude lập khi đọc thiết kế:
 *   { "screens": [ { "id": "S05", "states": ["today_open", ...], "evidence": "03-dashboard.png" } ],
 *     "components": [ { "id": "C01", "states": [...] } ] }
 * Thoát 1 nếu thiếu màn/thành phần bắt buộc hoặc thiếu trạng thái bắt buộc.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REF = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'references', 'required-screens.json');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const file = args.find((a) => !a.startsWith('--')) || 'docs/ui/screens.json';

const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
let req, got;
try { req = load(REF); got = load(file); } catch (e) { console.error(`Không đọc được dữ liệu: ${e.message}`); process.exit(2); }

const index = (arr = []) => new Map(arr.map((x) => [x.id, x]));
const result = { missingItems: [], missingStates: [], extraItems: [], optionalMissing: [], covered: 0, total: 0 };

for (const kind of ['screens', 'components']) {
  const have = index(got[kind]);
  const need = index(req[kind]);
  for (const r of req[kind]) {
    if (!r.required && !have.has(r.id)) continue;
    result.total++;
    const g = have.get(r.id);
    if (!g) { result.missingItems.push({ id: r.id, name: r.name, task: r.task }); continue; }
    const states = new Set(g.states || []);
    const miss = r.states.filter((s) => !states.has(s));
    if (miss.length) result.missingStates.push({ id: r.id, name: r.name, task: r.task, missing: miss });
    else result.covered++;
    const optMiss = (r.optionalStates || []).filter((s) => !states.has(s));
    if (optMiss.length) result.optionalMissing.push({ id: r.id, missing: optMiss });
  }
  for (const g of got[kind] || []) if (!need.has(g.id)) result.extraItems.push({ id: g.id, name: g.name || '', evidence: g.evidence || '' });
}

if (asJson) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Độ phủ: ${result.covered}/${result.total} mục đủ trạng thái bắt buộc`);
  if (result.missingItems.length) {
    console.log('\nTHIẾU HẲN (chưa có trong thiết kế):');
    for (const m of result.missingItems) console.log(`  ✖ ${m.id} ${m.name}  → ${m.task}`);
  }
  if (result.missingStates.length) {
    console.log('\nTHIẾU TRẠNG THÁI:');
    for (const m of result.missingStates) console.log(`  ✖ ${m.id} ${m.name}: ${m.missing.join(', ')}`);
  }
  if (result.extraItems.length) {
    console.log('\nCÓ TRONG THIẾT KẾ NHƯNG KHÔNG NẰM TRONG DANH SÁCH (phạm vi/chi phí phát sinh, cần quyết định giữ hay bỏ):');
    for (const m of result.extraItems) console.log(`  ? ${m.id} ${m.name} ${m.evidence ? `(${m.evidence})` : ''}`);
  }
  if (result.optionalMissing.length) {
    console.log('\nTrạng thái tuỳ chọn chưa có (không chặn):');
    for (const m of result.optionalMissing) console.log(`  · ${m.id}: ${m.missing.join(', ')}`);
  }
  if (!result.missingItems.length && !result.missingStates.length) console.log('\n✔ Đủ mọi màn và trạng thái bắt buộc.');
}
process.exit(result.missingItems.length || result.missingStates.length ? 1 : 0);
