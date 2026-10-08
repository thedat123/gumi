import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { Banner } from '../../components/Banner';
import { Confetti, GameShell, GameStat } from '../../components/GameShell';
import { Gumi } from '../../components/Gumi';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

const TIME_LIMIT = 180; // brief: 3 phút
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '');
type Dir = 'across' | 'down';
type Word = (typeof vi.minigames.crossword.words)[number];

const K = (r: number, c: number) => `${r}-${c}`;
const cellsOf = (w: Word) => Array.from(w.answer, (ch, i) => ({
  key: w.dir === 'down' ? K(w.r + i, w.c) : K(w.r, w.c + i), ch,
}));

/** Ngày 16 — Gumi Bắt Chữ: crossword ô lồng nhau, GÕ TRỰC TIẾP vào ô (tự nhảy ô kế).
 *  Hết 3 phút là dừng, không chơi lại. */
export function Crossword() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 16;
  const m = vi.missions[day - 1];
  const cfg = vi.minigames.crossword;
  const words = cfg.words;

  // Bản đồ ô: key → { chữ đúng, số, chỉ số từ ngang/dọc đi qua }.
  const cells = useMemo(() => {
    const map = new Map<string, { ch: string; num?: number; across?: number; down?: number }>();
    words.forEach((w, wi) => cellsOf(w).forEach((cell, ci) => {
      const e = map.get(cell.key) ?? { ch: cell.ch };
      e.ch = cell.ch;
      if (w.dir === 'across') e.across = wi; else e.down = wi;
      if (ci === 0) e.num = w.num;
      map.set(cell.key, e);
    }));
    return map;
  }, [words]);

  const wordKeys = useMemo(() => words.map((w) => cellsOf(w).map((c) => c.key)), [words]);

  const [entries, setEntries] = useState<Record<string, string>>({});
  const [active, setActive] = useState<{ key: string; dir: Dir } | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const dirRef = useRef<Dir>('across'); // hướng gõ hiện tại (đồng bộ, không lệ thuộc render)

  // Từ đã giải = mọi ô của nó khớp đáp án.
  const solved = useMemo(
    () => words.map((_, wi) => wordKeys[wi]!.every((k, i) => (entries[k] ?? '') === words[wi]!.answer[i])),
    [entries, words, wordKeys],
  );
  const solvedCount = solved.filter(Boolean).length;
  const allSolved = solvedCount === words.length;

  // Đồng hồ 3 phút.
  useEffect(() => {
    if (done || failed || allSolved) return;
    if (timeLeft <= 0) { setFailed(true); playSfx('wrong'); api.submitMinigame(day, solvedCount * 5).catch(() => {}); return; }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, done, failed, allSolved, day, solvedCount]);

  // Kêu vui mỗi khi giải thêm một từ.
  const prevSolved = useRef(0);
  useEffect(() => { if (solvedCount > prevSolved.current) playSfx('happy'); prevSolved.current = solvedCount; }, [solvedCount]);

  // Thắng cả bảng.
  useEffect(() => {
    if (allSolved && !done && !failed) {
      setBurst((b) => b + 1); api.submitMinigame(day, words.length * 5).catch(() => {}); const t = setTimeout(() => setDone(true), 900); return () => clearTimeout(t);
    }
  }, [allSolved, done, failed, day, words.length]);

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;
  if (done) return <MissionDone day={day} points={m.points} note={cfg.success} />;
  if (failed) return (
    <div className="flex flex-col items-center gap-3 pt-6 text-center">
      <Gumi state="hap_hoi" size={140} />
      <Banner kind="error">{vi.minigames.common.timeUp}</Banner>
      <p className="max-w-xs text-small text-muted">{cfg.timeUp(solvedCount, words.length)}</p>
      <p className="rounded-pill bg-accent/15 px-4 py-2 text-small font-extrabold text-primary">+{solvedCount * 5} điểm · {solvedCount} từ đúng</p>
      <Link to="/journey" className="mt-1 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-6 font-semibold text-on-primary shadow-pop">{vi.minigames.common.backHome}</Link>
    </div>
  );

  const pickDir = (key: string, prefer?: Dir): Dir => {
    const c = cells.get(key)!;
    if (prefer === 'across' && c.across != null) return 'across';
    if (prefer === 'down' && c.down != null) return 'down';
    return c.across != null ? 'across' : 'down';
  };
  const focus = (key: string) => { const el = refs.current[key]; if (el) { el.focus(); el.select(); } };

  // Ô kế trong hướng (bỏ qua ô đã khoá); null nếu hết từ.
  const step = (key: string, dir: Dir, sign: 1 | -1): string | null => {
    const [r, c] = key.split('-').map(Number) as [number, number];
    const nk = dir === 'across' ? K(r, c + sign) : K(r + sign, c);
    const nc = cells.get(nk); if (!nc) return null;
    const cur = cells.get(key)!;
    const same = dir === 'across' ? nc.across != null && nc.across === cur.across : nc.down != null && nc.down === cur.down;
    return same ? nk : null;
  };
  const advance = (key: string, dir: Dir, sign: 1 | -1) => { const nk = step(key, dir, sign); if (nk) focus(nk); };

  const setDir = (key: string, d: Dir) => { dirRef.current = d; setActive({ key, dir: d }); };
  const onFocus = (key: string) => setDir(key, pickDir(key, dirRef.current));
  const onClick = (key: string) => {
    const c = cells.get(key)!;
    const toggle = active && active.key === key && c.across != null && c.down != null;
    setDir(key, toggle ? (active!.dir === 'across' ? 'down' : 'across') : pickDir(key, dirRef.current));
  };

  const type = (key: string, raw: string) => {
    const ch = norm(raw).slice(-1);
    setEntries((prev) => ({ ...prev, [key]: ch }));
    if (ch) advance(key, dirRef.current, 1); // nhảy ô ngay (đồng bộ, hướng lấy từ ref) để không rớt phím
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key: string) => {
    const dir = dirRef.current;
    // Bàn phím vật lý (máy tính): xử lý chữ ngay ở keydown — ổn định, không dính maxLength/selection.
    // (Mobile soft-keyboard không cho e.key là chữ → rơi xuống onChange bên dưới.)
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      setEntries((prev) => ({ ...prev, [key]: e.key.toUpperCase() }));
      advance(key, dir, 1);
      return;
    }
    if (e.key === 'Backspace') {
      if (!(entries[key] ?? '')) { e.preventDefault(); const pk = step(key, dir, -1); if (pk) { setEntries((p) => ({ ...p, [pk]: '' })); focus(pk); } }
      return;
    }
    if (e.key === ' ') { e.preventDefault(); onClick(key); return; }
    const moves: Record<string, [Dir, 1 | -1]> = { ArrowRight: ['across', 1], ArrowLeft: ['across', -1], ArrowDown: ['down', 1], ArrowUp: ['down', -1] };
    const mv = moves[e.key];
    if (mv) {
      const [r, c] = key.split('-').map(Number) as [number, number];
      const nk = mv[0] === 'across' ? K(r, c + mv[1]) : K(r + mv[1], c);
      if (cells.get(nk)) { e.preventDefault(); setDir(nk, mv[0]); focus(nk); }
    }
  };

  const activeWord = active ? (cells.get(active.key)![active.dir]) : undefined;
  const activeCells = activeWord != null ? new Set(wordKeys[activeWord]) : new Set<string>();

  const mmss = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  const focusWord = (wi: number) => {
    const first = wordKeys[wi]![0]!;
    setDir(first, words[wi]!.dir);
    setTimeout(() => focus(first), 0);
  };

  const ClueList = ({ dir, label }: { dir: Dir; label: string }) => (
    <div className="flex flex-col gap-1.5">
      <p className="text-caption font-extrabold uppercase tracking-wide text-muted">{label}</p>
      {words.map((w, wi) => (w.dir !== dir ? null : (
        <button key={w.num} type="button" onClick={() => focusWord(wi)}
          className={`rounded-card border px-2.5 py-1.5 text-left text-small leading-snug transition-colors ${solved[wi] ? 'border-success/50 bg-success/10 text-success' : activeWord === wi ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}>
          <span className="font-extrabold text-primary">{w.num}.</span> {w.clue} <span className="text-muted">({w.answer.length})</span>
        </button>
      )))}
    </div>
  );

  return (
    <GameShell act={actOfDay(day)} title={cfg.title} intro={cfg.intro} wide
      hud={<><GameStat icon="clock" value={mmss} tone={timeLeft <= 15 ? 'accent' : 'info'} /><GameStat icon="check" value={`${solvedCount}/${words.length}`} tone="success" /></>}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 lg:flex-row lg:items-center lg:gap-10">
        <div className="flex flex-col items-center gap-3">
        <div className="mx-auto w-max max-w-full overflow-x-auto">
          <div className="w-max">
            {Array.from({ length: cfg.rows }, (_, ri) => (
              <div key={ri} className="flex">
                {Array.from({ length: cfg.cols }, (_, ci) => {
                  const key = K(ri + 1, ci + 1);
                  const cell = cells.get(key);
                  if (!cell) return <span key={ci} className="h-8 w-8 sm:h-9 sm:w-9 lg:h-11 lg:w-11" />;
                  const isSolved = (cell.across != null && solved[cell.across]) || (cell.down != null && solved[cell.down]);
                  const inWord = activeCells.has(key);
                  const isActive = active?.key === key;
                  return (
                    <span key={ci} className="relative h-8 w-8 sm:h-9 sm:w-9 lg:h-11 lg:w-11">
                      {cell.num && <span className="pointer-events-none absolute left-[2px] top-0 z-10 text-[8px] font-bold leading-none text-muted">{cell.num}</span>}
                      <input
                        ref={(el) => { refs.current[key] = el; }}
                        value={entries[key] ?? ''}
                        onFocus={() => onFocus(key)}
                        onClick={() => onClick(key)}
                        onChange={(e) => type(key, e.target.value)}
                        onKeyDown={(e) => onKeyDown(e, key)}
                        inputMode="text" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                        aria-label={`Ô ${key}`}
                        className={`h-full w-full border text-center text-body font-extrabold uppercase caret-primary outline-none ${isSolved ? 'border-success/60 bg-success/20 text-success' : isActive ? 'border-primary bg-primary/15 text-text ring-2 ring-primary/40' : inWord ? 'border-primary/40 bg-primary/5 text-text' : 'border-border-strong/40 bg-surface text-text'}`}
                      />
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="-mt-2 text-center text-caption text-muted">{cfg.tapDir}</p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2">
          <ClueList dir="across" label={cfg.acrossLabel} />
          <ClueList dir="down" label={cfg.downLabel} />
        </div>
      </div>
      <Confetti fire={burst} />
    </GameShell>
  );
}
