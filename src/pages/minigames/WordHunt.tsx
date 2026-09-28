import { useMemo, useState } from 'react';
import { api } from '../../api';
import { Banner } from '../../components/Banner';
import { Confetti, GameShell, GameStat } from '../../components/GameShell';
import { Icon } from '../../components/Icon';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

const SIZE = 12;

// Vị trí 5 mật khẩu trên lưới (0-index) — cùng thứ tự với clues/sugars trong nội dung.
// dr/dc: hướng đặt chữ (ngang / dọc / chéo).
const LAYOUT: { word: string; r: number; c: number; dr: number; dc: number }[] = [
  { word: 'GAN',      r: 6, c: 1,  dr: 1, dc: 0 }, // dọc
  { word: 'LAOHOA',   r: 2, c: 0,  dr: 0, dc: 1 }, // ngang
  { word: 'TEBAO',    r: 0, c: 11, dr: 1, dc: 0 }, // dọc
  { word: 'COLLAGEN', r: 0, c: 0,  dr: 0, dc: 1 }, // ngang
  { word: 'TRASUA',   r: 4, c: 3,  dr: 1, dc: 1 }, // chéo
];

const cellsOf = (l: (typeof LAYOUT)[number]) => Array.from(l.word, (_, i) => ({ r: l.r + l.dr * i, c: l.c + l.dc * i }));

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lưới cố định (seed) — đặt 5 từ rồi đổ chữ ngẫu nhiên ổn định vào ô trống.
const GRID: string[][] = (() => {
  const g: string[][] = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill(''));
  LAYOUT.forEach((l) => Array.from(l.word).forEach((ch, i) => { g[l.r + l.dr * i]![l.c + l.dc * i] = ch; }));
  const rnd = mulberry32(20260916);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!g[r]![c]) g[r]![c] = String.fromCharCode(65 + Math.floor(rnd() * 26));
  return g;
})();

const key = (r: number, c: number) => `${r}-${c}`;

// Đường thẳng (ngang/dọc/chéo) từ a → b; rỗng nếu không thẳng hàng.
function line(a: { r: number; c: number }, b: { r: number; c: number }) {
  const dr = Math.sign(b.r - a.r), dc = Math.sign(b.c - a.c);
  const len = Math.max(Math.abs(b.r - a.r), Math.abs(b.c - a.c)) + 1;
  const straight = a.r === b.r || a.c === b.c || Math.abs(b.r - a.r) === Math.abs(b.c - a.c);
  if (!straight) return null;
  return Array.from({ length: len }, (_, i) => ({ r: a.r + dr * i, c: a.c + dc * i }));
}

const sameCells = (p: { r: number; c: number }[], q: { r: number; c: number }[]) =>
  p.length === q.length && p.every((cell, i) => cell.r === q[i]!.r && cell.c === q[i]!.c);

/** Ngày 9 — Truy Tìm Mật Khẩu: word search lưới 12×12. Chạm ô ĐẦU rồi ô CUỐI của từ để bắt.
 *  Giải 5 gợi ý (dọc/ngang/chéo) để phá khoá. */
export function WordHunt() {
  const day = 9;
  const m = vi.missions[day - 1]!;
  const cfg = vi.minigames.wordHunt;

  const [found, setFound] = useState<boolean[]>(() => LAYOUT.map(() => false));
  const [start, setStart] = useState<{ r: number; c: number } | null>(null);
  const [warn, setWarn] = useState(0);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);

  const foundCells = useMemo(() => {
    const s = new Set<string>();
    LAYOUT.forEach((l, i) => { if (found[i]) cellsOf(l).forEach((cell) => s.add(key(cell.r, cell.c))); });
    return s;
  }, [found]);

  if (done) return <MissionDone day={day} points={m.points} note={cfg.success} />;

  const foundCount = found.filter(Boolean).length;

  const tap = (r: number, c: number) => {
    if (foundCells.has(key(r, c))) return;
    if (!start) { playSfx('pop'); setStart({ r, c }); return; }
    const path = line(start, { r, c });
    setStart(null);
    if (!path) { playSfx('wrong'); setWarn((n) => n + 1); return; }
    const hit = LAYOUT.findIndex((l, i) => !found[i] && (sameCells(path, cellsOf(l)) || sameCells([...path].reverse(), cellsOf(l))));
    if (hit < 0) { playSfx('wrong'); setWarn((n) => n + 1); return; }
    const nf = found.map((f, i) => (i === hit ? true : f));
    setFound(nf);
    playSfx('pop');
    if (nf.every(Boolean)) { playSfx('happy'); setBurst((n) => n + 1); api.submitMinigame(day).catch(() => {}); setTimeout(() => setDone(true), 1100); }
  };

  return (
    <GameShell act={actOfDay(day)} title={cfg.title} intro={cfg.intro}
      hud={<GameStat icon="check" value={cfg.found(foundCount, LAYOUT.length)} tone="success" />}
      footer={<Banner kind="info">{cfg.note}</Banner>}>
      <div className="flex flex-1 flex-col gap-3">
        {warn > 0 && <div key={warn} className="shake"><Banner kind="error">{cfg.wrong}</Banner></div>}

        {/* Lưới chữ 12×12 — chạm ô đầu rồi ô cuối của một từ. */}
        <div className="mx-auto w-max rounded-card border border-border bg-white p-1.5 shadow-soft">
          {GRID.map((row, r) => (
            <div key={r} className="flex">
              {row.map((ch, c) => {
                const isFound = foundCells.has(key(r, c));
                const isStart = start?.r === r && start?.c === c;
                return (
                  <button key={c} type="button" onClick={() => tap(r, c)} disabled={isFound}
                    className={`h-6 w-6 text-caption font-bold uppercase sm:h-7 sm:w-7 ${isFound ? 'rounded bg-success text-on-primary' : isStart ? 'rounded bg-primary text-on-primary' : 'text-text active:bg-primary/15'}`}>
                    {ch}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* 5 gợi ý — gạch ngang khi đã bắt được từ tương ứng. */}
        <div className="rounded-card border border-border bg-surface/95 p-3 shadow-soft">
          <p className="mb-1.5 text-caption font-bold text-muted">{cfg.cluesTitle}</p>
          <ol className="flex list-decimal flex-col gap-1 pl-4 text-caption">
            {cfg.clues.map((clue, i) => (
              <li key={i} className={found[i] ? 'text-success' : 'text-text'}>
                {clue} {found[i] && <span className="font-bold">→ {cfg.sugars[i]}</span>}
                {found[i] && <Icon name="check" size={13} strokeWidth={2.6} className="ml-1 inline" />}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <Confetti fire={burst} />
    </GameShell>
  );
}
