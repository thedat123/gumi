import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { Button } from '../../components/Button';
import { Confetti, GameShell, GameStat } from '../../components/GameShell';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { playSfx } from '../../lib/sfx';
import {
  CAT_QUEUE, NEKO_COLS, NEKO_ROWS, START_CATS, fallCats, filledRows,
  horizontalRange, pushUp, settleRows, type NekoCat, type NekoStyle,
} from '../../lib/nekoSlide';

const TARGET = 3;
const PALETTE: Record<NekoStyle, string> = {
  burgundy: '#B83556', rose: '#DC97A5', gold: '#FAB20A',
  blue: '#3966A4', cream: '#FADED2', brown: '#845747',
};

/** Draw a horizontal cat as one body with a face, paws and tail; no emoji font dependency. */
function CatArt({ len, style, spotted = false }: { len: number; style: NekoStyle; spotted?: boolean }) {
  const width = len * 54;
  const dark = style === 'blue' || style === 'burgundy' || style === 'brown';
  const ink = dark ? '#fff8f0' : '#4b2735';
  return (
    <svg className="neko-art" viewBox={`0 0 ${width} 54`} aria-hidden="true" preserveAspectRatio="none">
      <path d={`M8 13 Q7 8 5 3 L17 9 Q25 7 33 9 L43 3 L43 13 Q${width - 15} 8 ${width - 7} 18 Q${width - 2} 25 ${width - 7} 39 Q${width - 14} 44 38 42 Q25 47 12 42 Q1 39 4 27 Z`}
        fill={PALETTE[style]} stroke="#4b2735" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M8 15 Q13 11 19 13" fill="none" stroke="#fff" strokeWidth="2" opacity=".46" strokeLinecap="round" />
      {spotted && <><ellipse cx={Math.max(38, width * .64)} cy="18" rx="8" ry="5" fill="#845747" opacity=".65" /><ellipse cx={Math.max(44, width * .78)} cy="31" rx="5" ry="4" fill="#845747" opacity=".55" /></>}
      <circle cx="16" cy="25" r="2.1" fill={ink} /><circle cx="32" cy="25" r="2.1" fill={ink} />
      <path d="M20 31 Q24 36 28 31 M24 28 l-2 2 h4 z" fill={ink} stroke={ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 40 Q16 44 20 40 M31 41 Q36 45 41 40" fill="none" stroke="#4b2735" strokeWidth="2" strokeLinecap="round" />
      {len > 1 && <path d={`M${width - 26} 41 Q${width - 20} 47 ${width - 14} 40 M${width - 24} 14 Q${width - 13} 8 ${width - 8} 20`} fill="none" stroke="#4b2735" strokeWidth="2.3" strokeLinecap="round" />}
    </svg>
  );
}

type Drag = { source: 'tray' | 'board'; id?: number; startX: number; origin: number; col: number; lo: number; hi: number; pointerId: number };

/** Day 21: drag cats left/right. A complete eight-cell row disappears. */
export function SlidingPuzzle({ onSolved }: { onSolved?: () => void } = {}) {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 21;
  const [cats, setCats] = useState<NekoCat[]>(START_CATS);
  const catsRef = useRef<NekoCat[]>(START_CATS);
  const [queueIndex, setQueueIndex] = useState(0);
  const [trayCol, setTrayCol] = useState(3);
  const [lines, setLines] = useState(0);
  const linesRef = useRef(0);
  const [moves, setMoves] = useState(0);
  const [clearing, setClearing] = useState<number[]>([]);
  const [message, setMessage] = useState('Dịch một mèo trên bàn; mèo ở khay sẽ tự đẩy các hàng lên.');
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => { if (timerRef.current != null) window.clearTimeout(timerRef.current); }, []);

  const next = CAT_QUEUE[queueIndex % CAT_QUEUE.length]!;
  const cell = () => (boardRef.current?.getBoundingClientRect().width ?? 320) / NEKO_COLS;
  const changeCats = (nextCats: NekoCat[]) => { catsRef.current = nextCats; setCats(nextCats); };

  const pushNext = () => {
    if (catsRef.current.some((cat) => cat.row === 0)) {
      setMessage('Bàn đã chạm đỉnh. Hãy xoá một hàng trước khi thêm mèo.');
      playSfx('wrong');
      return;
    }
    setBusy(true);
    setMessage('Mèo ở khay sẽ đẩy bàn lên sau 1 giây...');
    timerRef.current = window.setTimeout(() => {
      const raised = pushUp(catsRef.current, { id: 6 + queueIndex, col: trayCol, len: next.len, style: next.style });
      setBusy(false);
      if (!raised) { setMessage('Bàn đã chạm đỉnh. Hãy xoá một hàng trước khi thêm mèo.'); return; }
      resolve(raised);
      setQueueIndex((value) => value + 1);
      setTrayCol(3);
      setMessage('Các hàng đã lên một ô. Dịch mèo để chơi lượt tiếp.');
      playSfx('pop');
    }, 1000);
  };

  const resolve = (nextCats: NekoCat[], fromMove = false) => {
    const full = filledRows(nextCats);
    changeCats(nextCats);
    if (!full.length) { if (fromMove) pushNext(); return; }
    setBusy(true);
    setClearing(full);
    playSfx('sparkle');
    timerRef.current = window.setTimeout(() => {
      const result = settleRows(catsRef.current);
      changeCats(result.cats);
      linesRef.current += result.cleared;
      setLines(linesRef.current);
      setClearing([]);
      setBusy(false);
      setMessage(`${result.cleared} hàng biến mất!`);
      if (linesRef.current >= TARGET) {
        setBurst((value) => value + 1);
        playSfx('happy');
        timerRef.current = window.setTimeout(() => {
          if (onSolved) onSolved();
          else { api.submitMinigame(day).catch(() => {}); setDone(true); }
        }, 700);
      } else if (fromMove) pushNext();
    }, 390);
  };

  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>, source: 'tray' | 'board', cat?: NekoCat) => {
    if (busy || done) return;
    const [lo, hi] = cat ? horizontalRange(catsRef.current, cat) : [0, NEKO_COLS - next.len];
    const origin = cat?.col ?? trayCol;
    dragRef.current = { source, id: cat?.id, startX: event.clientX, origin, col: origin, lo, hi, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const col = Math.max(drag.lo, Math.min(drag.hi, drag.origin + Math.round((event.clientX - drag.startX) / cell())));
    if (col === drag.col) return;
    drag.col = col;
    if (drag.source === 'tray') setTrayCol(col);
    else changeCats(catsRef.current.map((cat) => cat.id === drag.id ? { ...cat, col } : cat));
  };

  const pointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (drag.source === 'board' && drag.col !== drag.origin) { setMoves((value) => value + 1); playSfx('pop'); resolve(fallCats(catsRef.current), true); }
  };

  const keyDown = (event: React.KeyboardEvent<HTMLButtonElement>, cat?: NekoCat) => {
    if (busy) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const step = event.key === 'ArrowLeft' ? -1 : 1;
      if (cat) {
        const current = catsRef.current.find((item) => item.id === cat.id)!;
        const [lo, hi] = horizontalRange(catsRef.current, current);
        const col = Math.max(lo, Math.min(hi, current.col + step));
        if (col !== current.col) { setMoves((value) => value + 1); resolve(fallCats(catsRef.current.map((item) => item.id === cat.id ? { ...item, col } : item)), true); }
      } else setTrayCol((value) => Math.max(0, Math.min(NEKO_COLS - next.len, value + step)));
    }
  };

  const reset = () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    changeCats(START_CATS);
    setQueueIndex(0); setTrayCol(3); setLines(0); linesRef.current = 0;
    setMoves(0); setClearing([]); setBusy(false); setDone(false);
    setMessage('Dịch một mèo trên bàn; mèo ở khay sẽ tự đẩy các hàng lên.');
  };

  if (done) return <MissionDone day={day} points={25} note={`Bạn đã xoá ${TARGET} hàng trong ${moves} lượt! Gumi đã thoát khỏi khu rừng mèo.`} />;

  const atTop = cats.some((cat) => cat.row === 0);
  const trayStyle = { left: `${trayCol / NEKO_COLS * 100}%`, width: `${next.len / NEKO_COLS * 100}%` };
  return (
    <GameShell wide act={actOfDay(day)} title="Ngày 21: Neko Slide" intro="Trượt mèo nằm ngang, lấp đầy một hàng để xoá."
      hud={<><GameStat icon="sparkle" value={`${lines}/${TARGET} hàng`} tone="accent" /><GameStat icon="map" value={`${moves} lượt`} /></>}
      footer={<div className="neko-footer"><span aria-live="polite">{atTop && !busy ? 'Bàn đã chạm đỉnh. Xoá một hàng để tiếp tục.' : message}</span><Button variant="secondary" onClick={reset} className="px-4! py-2! text-small!">Chơi lại</Button></div>}>
      <section className="neko-layout" aria-label="Bàn chơi Neko Slide">
        <aside className="neko-score-panel"><span>MÀN CUỐI</span><strong>21</strong><small>🐟 {Math.max(0, TARGET - lines)} hàng còn lại</small></aside>
        <div className="neko-main">
          <div className="neko-board-header"><span>✦ NEKO SLIDE</span><span>{NEKO_COLS} × {NEKO_ROWS}</span></div>
          <div ref={boardRef} className="neko-board" role="group" aria-label={`Bàn cờ ${NEKO_COLS} cột, ${NEKO_ROWS} hàng`}>
            {Array.from({ length: NEKO_COLS * NEKO_ROWS }, (_, index) => <span key={index} className={`neko-cell neko-cell-${index % 5}`} aria-hidden="true" />)}
            {cats.map((cat) => <button key={cat.id} type="button" className={`neko-cat ${clearing.includes(cat.row) ? 'neko-clear' : ''}`} style={{ left: `${cat.col / NEKO_COLS * 100}%`, top: `${cat.row / NEKO_ROWS * 100}%`, width: `${cat.len / NEKO_COLS * 100}%`, height: `${100 / NEKO_ROWS}%` }}
              aria-label={`Mèo ở hàng ${cat.row + 1}, cột ${cat.col + 1}, dài ${cat.len} ô. Kéo ngang hoặc dùng phím trái phải.`}
              onPointerDown={(event) => pointerDown(event, 'board', cat)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { dragRef.current = null; }} onKeyDown={(event) => keyDown(event, cat)}>
              <CatArt len={cat.len} style={cat.style} spotted={cat.style === 'cream' && cat.id % 2 === 1} />
            </button>)}
          </div>
          <div className="neko-tray" aria-label="Mèo tiếp theo">
            <span className="neko-tray-label">CHỌN CỘT · TỰ ĐẨY LÊN SAU MỖI LƯỢT</span>
            <div className="neko-tray-track">
              <button type="button" className="neko-tray-cat" style={trayStyle} aria-label={`Mèo dài ${next.len} ô. Kéo ngang để chọn cột; sau khi dịch mèo trên bàn, mèo này sẽ tự đẩy bàn lên.`}
                onPointerDown={(event) => pointerDown(event, 'tray')} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { dragRef.current = null; }} onKeyDown={(event) => keyDown(event)}>
                <CatArt len={next.len} style={next.style} />
              </button>
            </div>
          </div>
        </div>
        <aside className="neko-next-panel"><span>SẮP TỚI</span>{[1, 2, 3].map((offset) => { const upcoming = CAT_QUEUE[(queueIndex + offset) % CAT_QUEUE.length]!; return <div key={offset} className="neko-preview" style={{ '--preview': PALETTE[upcoming.style] } as CSSProperties}><CatArt len={upcoming.len} style={upcoming.style} /></div>; })}<span className="neko-goal">ĐẦY HÀNG<br />✦ XOÁ ✦</span></aside>
      </section>
      <Confetti fire={burst} />
    </GameShell>
  );
}
