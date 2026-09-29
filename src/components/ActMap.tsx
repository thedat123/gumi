import { Link } from 'react-router-dom';
import { vi } from '../content/vi';
import { isMilestone } from '../lib/scoring';
import { Gumi } from './Gumi';
import { Icon } from './Icon';
import { RegionScene } from './RegionScene';
import type { DayState } from '../api/types';

/* ---- Bản đồ MỘT HỒI (7 ngày) lấp đầy màn hình như world-map game ---- */
const N = 7;                                   // 7 ngày / hồi
const reached = (s: DayState) => s === 'checked' || s === 'passed' || s === 'open' || s === 'dying';
// Vị trí theo % khung → luôn lấp đầy chiều cao dù màn to/nhỏ. Ngày đầu dưới, cửa ải trên.
const yPct = (i: number) => 90 - i * (76 / (N - 1));
const xPct = (i: number, mile: boolean) => (mile ? 50 : 50 + 27 * Math.sin(i * 1.15 + 0.5));

const NODE: Record<DayState, { face: string; ring?: string }> = {
  checked: { face: 'border-white bg-gradient-to-b from-[#33A96B] to-[#1F7A4D] text-white' },
  passed: { face: 'border-white bg-gradient-to-b from-[#7196AD] to-[#55768C] text-white' },
  open: { face: 'border-white bg-gradient-to-b from-[#FDB43B] to-[#FA990A] text-on-accent' },
  dying: { face: 'border-white bg-gradient-to-b from-[#D6473F] to-[#B3261E] text-white' },
  missed: { face: 'border-white bg-gradient-to-b from-[#C7B2A9] to-[#A88F84] text-white' },
  rejected: { face: 'border-danger bg-surface text-danger' },
  future: { face: 'border-dashed border-white/70 bg-surface/65 text-muted' },
};

const DECOR: Record<1 | 2 | 3, [string, number, number, number][]> = {
  1: [['🌾', 8, 78, 30], ['🪷', 90, 70, 26], ['🐸', 12, 40, 24], ['🌿', 88, 30, 26], ['🍬', 6, 55, 22], ['🌾', 92, 92, 30]],
  2: [['🌲', 8, 80, 40], ['🍄', 90, 66, 24], ['🌲', 90, 34, 44], ['🦌', 10, 46, 30], ['🌰', 88, 90, 22], ['🌲', 6, 22, 36]],
  3: [['🗻', 88, 30, 40], ['⛄', 10, 70, 34], ['❄️', 90, 78, 22], ['🪨', 8, 44, 26], ['🏔️', 12, 20, 38], ['❄️', 84, 50, 20]],
};

function Glyph({ day, state, mile }: { day: number; state: DayState; mile: boolean }) {
  if (mile) {
    if (state === 'future') return <Icon name="lock" size={24} />;
    return day === 21 ? <Icon name="trophy" size={30} filled /> : <Icon name="star" size={28} filled />;
  }
  switch (state) {
    case 'checked': return <Icon name="check" size={24} strokeWidth={2.6} />;
    case 'passed': return <Icon name="shield" size={22} filled />;
    case 'open': return <Icon name="play" size={18} filled />;
    case 'missed': return <Icon name="x" size={22} strokeWidth={2.4} />;
    case 'rejected': return <Icon name="undo" size={20} />;
    case 'dying': return <span className="text-title">!</span>;
    default: return <span className="text-title font-black">{day}</span>;
  }
}

function pathThrough(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!, my = (a.y + b.y) / 2;
    d += ` C ${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
  }
  return d;
}

/** Bản đồ một Hồi: cảnh nền lấp đầy + con đường 7 chặng leo dốc + Gumi ở chặng hiện tại. */
export function ActMap({ days, today, act }: { days: DayState[]; today: number; act: 1 | 2 | 3 }) {
  const start = (act - 1) * 7;                               // index ngày đầu của hồi
  const acts = vi.story.acts[act - 1]!;
  const dayNums = Array.from({ length: N }, (_, i) => start + i + 1);
  const states = dayNums.map((d) => days[d - 1] ?? 'future');
  const pts = dayNums.map((d, i) => ({ x: xPct(i, isMilestone(d)), y: yPct(i) }));
  let frontier = -1;
  states.forEach((s, i) => { if (reached(s)) frontier = i; });
  const doneInAct = states.filter((s) => s === 'checked' || s === 'passed').length;
  const todayI = today - start - 1;                          // vị trí HÔM NAY trong hồi (nếu thuộc hồi này)
  const inThisAct = todayI >= 0 && todayI < N;

  return (
    <div className="act-map relative h-full w-full overflow-hidden rounded-[26px] shadow-pop ring-1 ring-white/40">
      {/* Cảnh nền vùng đất lấp đầy */}
      <div className="absolute inset-0"><RegionScene act={act} /></div>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 78% at 50% 8%, transparent 55%, rgba(20,16,30,0.28))' }} />

      {/* Cảnh vật hai bên */}
      {DECOR[act].map(([e, x, y, s], i) => (
        <span key={i} aria-hidden className="scene-decor pointer-events-none absolute z-[4] -translate-x-1/2 -translate-y-1/2 select-none" style={{ left: `${x}%`, top: `${y}%`, fontSize: s, animationDelay: `${i * 0.4}s` }}>{e}</span>
      ))}

      {/* Con đường leo dốc (kéo giãn theo khung) */}
      <svg className="absolute inset-0 z-[5] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`road${act}`} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="0">
            <stop offset="0" stopColor="#FA990A" /><stop offset="0.6" stopColor="#E0567F" /><stop offset="1" stopColor="#7196AD" />
          </linearGradient>
        </defs>
        <path d={pathThrough(pts)} fill="none" stroke="rgba(40,26,30,0.22)" strokeWidth="15" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={pathThrough(pts)} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="9" strokeLinecap="round" strokeDasharray="0.1 14" vectorEffect="non-scaling-stroke" />
        {frontier >= 1 && <path d={pathThrough(pts.slice(0, frontier + 1))} fill="none" stroke={`url(#road${act})`} strokeWidth="10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      </svg>

      {/* Bảng tên Hồi + tiến độ trong hồi */}
      <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-surface/90 px-4 py-1.5 shadow-pop backdrop-blur">
        <span aria-hidden className="text-title">{acts.icon}</span>
        <span className="text-left">
          <span className="block text-caption font-extrabold leading-none text-primary">HỒI {act} · {acts.range}</span>
          <span className="block text-small font-black leading-tight">{acts.name}</span>
        </span>
        <span className="ml-1 rounded-pill bg-primary px-2 py-0.5 text-caption font-black text-on-primary">{doneInAct}/{N}</span>
      </div>

      {/* Các chặng */}
      {dayNums.map((day, i) => {
        const state = states[i]!;
        const mile = isMilestone(day);
        const look = NODE[state];
        const locked = state === 'future';
        const active = state === 'open' || state === 'dying';
        const isToday = day === today;
        const m = vi.missions[day - 1]!;
        const size = mile ? 'h-[74px] w-[74px]' : 'h-[58px] w-[58px]';
        const circle = (
          <span className={`relative flex ${size} items-center justify-center rounded-full border-[3px] font-extrabold shadow-[0_6px_0_rgba(40,26,30,0.28)] ${look.face} ${mile ? 'ring-4 ring-[#F5C542]/80' : ''} ${active ? 'node-today' : ''} ${locked ? '' : 'transition-transform group-active:translate-y-1 group-active:shadow-[0_3px_0_rgba(40,26,30,0.28)]'}`}>
            <span aria-hidden className="absolute left-1/2 top-1.5 h-2.5 w-7 -translate-x-1/2 rounded-full bg-white/50 blur-[1px]" />
            <span className="relative flex items-center justify-center"><Glyph day={day} state={state} mile={mile} /></span>
          </span>
        );
        const label = (
          <span className={`pointer-events-none absolute left-1/2 top-[calc(100%+4px)] flex w-32 -translate-x-1/2 flex-col items-center rounded-pill px-2 py-0.5 text-center ${isToday ? 'bg-primary text-on-primary shadow-pop' : 'bg-surface/90 text-text shadow-soft backdrop-blur'}`}>
            <span className={`text-caption font-black leading-none ${isToday ? '' : 'text-muted'}`}>{isToday ? 'HÔM NAY' : `Ngày ${day}`}{mile && !isToday ? (day === 21 ? ' · Đích' : ' · Cửa ải') : ''}</span>
            <span className={`line-clamp-1 text-caption font-bold leading-tight ${locked ? 'opacity-70' : ''}`}>{m.title}</span>
          </span>
        );
        const style = { left: `${pts[i]!.x}%`, top: `${pts[i]!.y}%` };
        // Chỉ CHẶNG ĐANG MỞ mới vào chơi được — chặng đã xong / bị khoá / đã xong hôm nay đều không bấm được.
        if (!active) return <div key={day} className="absolute z-20 -translate-x-1/2 -translate-y-1/2 opacity-90" style={style} aria-disabled="true" aria-label={vi.map.nodeAria(day, m.title, vi.map.locked)}>{circle}{label}</div>;
        return <Link key={day} to={`/chapter/${day}`} className="group absolute z-20 -translate-x-1/2 -translate-y-1/2" style={style} aria-label={vi.map.nodeAria(day, m.title, m.title)}>{circle}{label}</Link>;
      })}

      {/* Gumi đứng trên chặng hôm nay (nếu thuộc hồi này) */}
      {inThisAct && (
        <div className="pointer-events-none absolute z-30 -translate-x-1/2" style={{ left: `${pts[todayI]!.x}%`, top: `calc(${pts[todayI]!.y}% - 62px)` }}>
          <Gumi state={states[todayI] === 'dying' ? 'hap_hoi' : 'bo_pho'} size={62} />
        </div>
      )}

      {/* Cổng vào / xuất phát dưới chân */}
      <div className="absolute left-1/2 bottom-2.5 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-pill bg-surface/90 px-4 py-1 shadow-soft backdrop-blur">
        <Icon name="flag" size={14} className="text-primary" />
        <span className="text-caption font-bold text-text">{act === 1 ? 'Xuất phát' : `Từ Hồi ${act - 1}`}</span>
      </div>
    </div>
  );
}
