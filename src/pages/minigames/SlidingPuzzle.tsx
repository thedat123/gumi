import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Confetti, GameShell, GameStat } from '../../components/GameShell';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

const GRID = 6;

type Orient = 'h' | 'v';
interface Piece { id: string; row: number; col: number; len: number; o: Orient; hero?: boolean; face: string; hue: number }

/** Các màn "giải cứu mèo" (kiểu Rush Hour): trượt mèo chắn đường để mèo chính (hero) thoát ra mép phải.
 *  Mọi màn đều được thiết kế chắc chắn GIẢI ĐƯỢC và dễ dần → phù hợp cửa ải tốt nghiệp. */
const LEVELS: Piece[][] = [
  [
    { id: 'hero', row: 2, col: 0, len: 2, o: 'h', hero: true, face: '😺', hue: 20 },
    { id: 'a', row: 0, col: 3, len: 2, o: 'v', face: '🐱', hue: 210 },
    { id: 'b', row: 2, col: 4, len: 2, o: 'v', face: '🐈', hue: 285 },
    { id: 'c', row: 0, col: 4, len: 2, o: 'h', face: '😸', hue: 140 },
  ],
  [
    { id: 'hero', row: 2, col: 0, len: 2, o: 'h', hero: true, face: '😺', hue: 20 },
    { id: 'v1', row: 0, col: 2, len: 3, o: 'v', face: '🐱', hue: 210 },
    { id: 'v2', row: 2, col: 4, len: 2, o: 'v', face: '🐈', hue: 285 },
    { id: 'h1', row: 5, col: 0, len: 2, o: 'h', face: '😹', hue: 45 },
  ],
  [
    { id: 'hero', row: 2, col: 0, len: 2, o: 'h', hero: true, face: '😺', hue: 20 },
    { id: 'v1', row: 2, col: 3, len: 3, o: 'v', face: '🐱', hue: 210 },
    { id: 'v2', row: 2, col: 5, len: 2, o: 'v', face: '🐈', hue: 285 },
    { id: 'h1', row: 0, col: 3, len: 2, o: 'h', face: '😸', hue: 140 },
  ],
];

const clone = (lvl: Piece[]) => lvl.map((p) => ({ ...p }));
const isSolved = (ps: Piece[]) => { const h = ps.find((p) => p.hero)!; return h.col + h.len === GRID; };

/** Lưới đánh dấu ô đã bị chiếm (bỏ qua piece `exclude` khi tính vùng trượt cho chính nó). */
function occupancy(ps: Piece[], exclude?: string): boolean[][] {
  const g = Array.from({ length: GRID }, () => Array<boolean>(GRID).fill(false));
  for (const p of ps) {
    if (p.id === exclude) continue;
    for (let k = 0; k < p.len; k++) {
      const r = p.o === 'v' ? p.row + k : p.row;
      const c = p.o === 'h' ? p.col + k : p.col;
      g[r]![c] = true;
    }
  }
  return g;
}

/** Khoảng [lo, hi] mà toạ độ dẫn đầu (col nếu ngang, row nếu dọc) có thể trượt tới mà không đè ai. */
function freeRange(p: Piece, g: boolean[][]): [number, number] {
  const fits = (start: number): boolean => {
    for (let k = 0; k < p.len; k++) {
      const r = p.o === 'v' ? start + k : p.row;
      const c = p.o === 'h' ? start + k : p.col;
      if (r < 0 || c < 0 || r >= GRID || c >= GRID || g[r]![c]) return false;
    }
    return true;
  };
  const lead = p.o === 'h' ? p.col : p.row;
  let lo = lead, hi = lead;
  while (fits(lo - 1)) lo--;
  while (fits(hi + 1)) hi++;
  return [lo, hi];
}

/** Ngày 21 — "Giải Cứu Mèo Gumi": trượt các bé mèo chắn lối để mèo chính thoát ra cửa phải.
 *  `onSolved` (Ngày 21): giải xong KHÔNG tự chốt điểm mà chuyển sang bước gửi lời nhắn tốt nghiệp. */
export function SlidingPuzzle({ onSolved }: { onSolved?: () => void } = {}) {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 21;
  const m = vi.missions[day - 1];
  const cfg = vi.minigames.slide;

  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; o: Orient; startLead: number; lo: number; hi: number; startPx: number; cell: number; moved: boolean } | null>(null);

  const [level, setLevel] = useState(0);
  const [pieces, setPieces] = useState<Piece[]>(() => clone(LEVELS[0]!));
  const [moves, setMoves] = useState(0);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;
  if (done) return <MissionDone day={day} points={m.points} note={`Vượt cả ${LEVELS.length} màn trong ${moves} bước! ${cfg.success}`} />;

  const heroRow = pieces.find((p) => p.hero)!.row;

  const onDown = (e: ReactPointerEvent, p: Piece) => {
    if (clearing) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const g = occupancy(pieces, p.id);
    const [lo, hi] = freeRange(p, g);
    drag.current = {
      id: p.id, o: p.o, startLead: p.o === 'h' ? p.col : p.row, lo, hi,
      startPx: p.o === 'h' ? e.clientX : e.clientY, cell: rect.width / GRID, moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const now = d.o === 'h' ? e.clientX : e.clientY;
    const target = Math.min(d.hi, Math.max(d.lo, d.startLead + Math.round((now - d.startPx) / d.cell)));
    setPieces((ps) => ps.map((p) => {
      if (p.id !== d.id) return p;
      const cur = p.o === 'h' ? p.col : p.row;
      if (cur === target) return p;
      d.moved = true;
      return d.o === 'h' ? { ...p, col: target } : { ...p, row: target };
    }));
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    playSfx('pop');
    setMoves((n) => n + 1);
    setPieces((ps) => {
      if (!isSolved(ps)) return ps;
      // Thắng màn: cho mèo trượt hẳn ra cửa rồi qua màn kế / hoàn thành.
      setClearing(true);
      playSfx('happy');
      const last = level >= LEVELS.length - 1;
      setTimeout(() => {
        if (last) {
          setBurst((n) => n + 1);
          if (onSolved) { setTimeout(() => onSolved(), 900); }        // Ngày 21 → chuyển sang gửi lời nhắn (điểm chốt ở đó)
          else { api.submitMinigame(day).catch(() => {}); setTimeout(() => setDone(true), 900); }
        } else { const nx = level + 1; setLevel(nx); setPieces(clone(LEVELS[nx]!)); setClearing(false); }
      }, 650);
      return ps;
    });
  };

  const reset = () => { setPieces(clone(LEVELS[level]!)); };

  return (
    <GameShell act={actOfDay(day)} title={cfg.title} intro={cfg.intro}
      hud={<><GameStat icon="map" value={cfg.level(level + 1, LEVELS.length)} /><GameStat icon="sparkle" value={cfg.moves(moves)} tone="accent" /></>}
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="hidden text-caption font-semibold text-muted sm:block">{cfg.hint}</p>
          <div className="flex flex-1 justify-end gap-2">
            <Button variant="secondary" onClick={reset} className="px-4! py-1.5! text-small!">{cfg.reset}</Button>
            {onSolved && <Button variant="ghost" onClick={onSolved} className="px-3! py-1.5! text-small!">{cfg.toMessage}</Button>}
          </div>
        </div>
      }>
      <div className="flex flex-1 items-center justify-center">
        <div className="relative w-full max-w-[380px]">
          {/* Cửa thoát bên phải, ngang hàng mèo chính */}
          <div className="pointer-events-none absolute -right-1.5 z-10 flex items-center" style={{ top: `${(heroRow / GRID) * 100}%`, height: `${(1 / GRID) * 100}%` }}>
            <span className="text-title">➡️</span>
          </div>
          <div
            ref={boardRef}
            className="relative aspect-square w-full overflow-hidden rounded-2xl border-4 border-[#6b3f2a] shadow-pop"
            style={{
              touchAction: 'none',
              background:
                'repeating-linear-gradient(45deg, #caa07d 0 8px, #c29873 8px 16px), linear-gradient(180deg, #d3ab86, #c69a72)',
            }}
          >
            {/* Lưới ô nền kiểu vải đan */}
            {Array.from({ length: GRID * GRID }, (_, i) => (
              <span key={i} className="absolute border border-[#00000010]"
                style={{ left: `${(i % GRID) / GRID * 100}%`, top: `${Math.floor(i / GRID) / GRID * 100}%`, width: `${100 / GRID}%`, height: `${100 / GRID}%` }} />
            ))}

            {pieces.map((p) => {
              const horiz = p.o === 'h';
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-label={p.hero ? 'Mèo chính' : 'Mèo chắn đường'}
                  onPointerDown={(e) => onDown(e, p)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  className={`absolute p-1 transition-[left,top] duration-150 ease-out ${clearing && p.hero ? 'opacity-0 duration-500' : ''}`}
                  style={{
                    left: `${(p.col / GRID) * 100}%`,
                    top: `${(p.row / GRID) * 100}%`,
                    width: `${((horiz ? p.len : 1) / GRID) * 100}%`,
                    height: `${((horiz ? 1 : p.len) / GRID) * 100}%`,
                  }}
                >
                  <span
                    className={`flex h-full w-full items-center justify-center rounded-2xl border-2 shadow-soft ${p.hero ? 'border-white ring-2 ring-amber-300' : 'border-white/70'}`}
                    style={{
                      background: p.hero
                        ? 'linear-gradient(180deg,#ffffff,#f0e6da)'
                        : `linear-gradient(180deg, hsl(${p.hue} 55% 74%), hsl(${p.hue} 50% 62%))`,
                    }}
                  >
                    <span className="text-title drop-shadow-sm" aria-hidden="true">{p.face}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <Confetti fire={burst} />
    </GameShell>
  );
}
