#!/usr/bin/env node
/**
 * Kiểm tra tĩnh CSS chuyển động (chạy: npm run motion):
 *  1. @keyframes chỉ được animate `transform` và `opacity` (rẻ cho GPU, không làm giật bố cục).
 *  2. Phải có khối @media (prefers-reduced-motion: reduce) vô hiệu hoá hoạt ảnh.
 *  3. Không dùng `transition: all` / `transition-property: all`.
 * In thêm danh sách hoạt ảnh vô hạn để người xem cân nhắc pin. Thoát 1 nếu có vi phạm.
 */
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED = new Set(['transform', 'opacity', 'animation-timing-function']);

function walk(p) {
  const st = fs.statSync(p);
  if (st.isFile()) return p.endsWith('.css') ? [p] : [];
  return fs.readdirSync(p).flatMap((f) => walk(path.join(p, f)));
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

function blockAt(css, open) { // trả về nội dung giữa { } khớp cặp, bắt đầu từ vị trí dấu {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return { body: css.slice(open + 1, i), end: i };
  }
  return { body: css.slice(open + 1), end: css.length };
}

export function analyze(files) {
  const out = { violations: [], infinite: [], keyframes: [], hasReduced: false, reducedKillsAnimation: false };
  for (const f of files) {
    const css = stripComments(fs.readFileSync(f, 'utf8'));
    const rel = path.relative(process.cwd(), f) || f;

    for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
      const { body } = blockAt(css, m.index + m[0].length - 1);
      const props = new Set();
      for (const d of body.matchAll(/([a-zA-Z-]+)\s*:/g)) props.add(d[1].toLowerCase());
      out.keyframes.push({ file: rel, name: m[1], props: [...props] });
      for (const p of props) if (!ALLOWED.has(p) && !p.startsWith('--')) out.violations.push(`${rel}: @keyframes ${m[1]} animate "${p}" (chỉ được transform/opacity)`);
    }

    for (const m of css.matchAll(/@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/g)) {
      out.hasReduced = true;
      const { body } = blockAt(css, m.index + m[0].length - 1);
      if (/animation\s*:\s*none/.test(body)) out.reducedKillsAnimation = true;
    }
    if (/html\.rm[^{]*\{[^}]*animation\s*:\s*none/.test(css)) out.hasClassFallback = true;

    for (const m of css.matchAll(/transition(?:-property)?\s*:\s*all\b/g)) out.violations.push(`${rel}: dùng "${m[0]}" (hãy liệt kê thuộc tính cụ thể)`);

    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/animation\s*:[^;]*\binfinite\b/.test(m[2]) || /animation-iteration-count\s*:\s*infinite/.test(m[2])) out.infinite.push(`${rel}: ${m[1].trim().replace(/\s+/g, ' ')}`);
    }
  }
  if (!out.hasReduced) out.violations.push('Thiếu khối @media (prefers-reduced-motion: reduce)');
  else if (!out.reducedKillsAnimation) out.violations.push('Khối prefers-reduced-motion không có "animation: none": người dùng giảm chuyển động vẫn thấy hoạt ảnh');
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = (targets.length ? targets : ['src']).flatMap(walk);
  const r = analyze(files);
  console.log(`Đã quét ${files.length} tệp CSS, ${r.keyframes.length} @keyframes.`);
  for (const k of r.keyframes) console.log(`  · ${k.name}: ${k.props.join(', ')}`);
  if (r.infinite.length) {
    console.log(`\nHoạt ảnh chạy vô hạn (${r.infinite.length}), mỗi màn chỉ nên có tối đa một mascot chuyển động:`);
    for (const i of r.infinite) console.log(`  ∞ ${i}`);
  }
  if (r.violations.length) {
    console.log('\nVI PHẠM:');
    for (const v of r.violations) console.log(`  ✖ ${v}`);
    process.exit(1);
  }
  console.log('\n✔ Chuyển động đạt các quy tắc kiểm tra tĩnh.');
}
