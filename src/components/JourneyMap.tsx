import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { vi } from '../content/vi';
import { isMilestone } from '../lib/scoring';
import { Gumi } from './Gumi';
import { Icon } from './Icon';
import { RegionScene } from './RegionScene';
import type { DayState } from '../api/types';

/* ---- Con đường leo núi: Ngày 1 ở DƯỚI (xuất phát) → Ngày 21 ở TRÊN (đích). Một con đường liền mạch. ---- */
const W = 380;
const RH = 90;         // khoảng cách dọc giữa 2 chặng
const TOP = 96;        // chừa chỗ cho cờ ĐÍCH
const N = 21;
const H = TOP + (N - 1) * RH + 104;
const yOf = (day: number) => TOP + (N - day) * RH;
const xOf = (day: number) => (isMilestone(day) ? 190 : 190 + 116 * Math.sin(day * 0.8 + 0.4));
const reached = (s: DayState) => s === 'checked' || s === 'passed' || s === 'open' || s === 'dying';

// Ranh giới 3 vùng đất (theo y): trên cùng là Đỉnh 0% (Hồi 3), dưới cùng là Đầm Lầy (Hồi 1).
const B23 = (yOf(14) + yOf(15)) / 2;
const B12 = (yOf(7) + yOf(8)) / 2;
const BANDS = [
  { act: 3 as const, top: 0, height: B23 },
  { act: 2 as const, top: B23, height: B12 - B23 },
  { act: 1 as const, top: B12, height: H - B12 },
];

const NODE: Record<DayState, { face: string; text: string }> = {
  checked: { face: 'border-white bg-gradient-to-b from-[#33A96B] to-[#1F7A4D] text-white', text: vi.day.checked },
  passed: { face: 'border-white bg-gradient-to-b from-[#7196AD] to-[#55768C] text-white', text: vi.day.passed },
  open: { face: 'border-white bg-gradient-to-b from-[#FDB43B] to-[#FA990A] text-on-accent', text: vi.day.today },
  dying: { face: 'border-white bg-gradient-to-b from-[#D6473F] to-[#B3261E] text-white', text: vi.day.dying },
  missed: { face: 'border-white bg-gradient-to-b from-[#C7B2A9] to-[#A88F84] text-white', text: vi.day.missed },
  rejected: { face: 'border-danger bg-surface text-danger', text: vi.day.rejected },
  future: { face: 'border-dashed border-white/70 bg-surface/70 text-muted', text: vi.map.locked },
};

/** Biểu tượng trong nút chặng: mốc (cửa ải/đích/khoá) hoặc trạng thái; ngày thường chưa tới thì hiện số. */
function Glyph({ day, state, mile }: { day: number; state: DayState; mile: boolean }) {
  if (mile) {
    if (state === 'future') return <Icon name="lock" size={22} />;
    return day === 21 ? <Icon name="trophy" size={26} filled /> : <Icon name="star" size={24} filled />;
  }
  switch (state) {
    case 'checked': return <Icon name="check" size={22} strokeWidth={2.4} />;
    case 'passed': return <Icon name="shield" size={20} filled />;
    case 'open': return <Icon name="play" size={17} filled />;
    case 'missed': return <Icon name="x" size={20} strokeWidth={2.4} />;
    case 'rejected': return <Icon name="undo" size={19} />;
    case 'dying': return <span>!</span>;
    default: return <span>{day}</span>;
  }
}

function pathThrough(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!, mx = (a.x + b.x) / 2;
    d += ` C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
  }
  return d;
}

function Node({ day, state, isToday }: { day: number; state: DayState; isToday: boolean }) {
  const mile = isMilestone(day);
  const m = vi.missions[day - 1]!;
  const look = NODE[state];
  const locked = state === 'future';
  const active = state === 'open' || state === 'dying';
  const size = mile ? 'h-[76px] w-[76px] text-title' : 'h-[58px] w-[58px] text-body';
  const style = { left: `${(xOf(day) / W) * 100}%`, top: `${yOf(day)}px` };

  const circle = (
    <span className={`relative flex ${size} items-center justify-center rounded-full border-[3px] font-extrabold shadow-[0_5px_0_rgba(58,36,30,0.22)] ${look.face} ${mile ? 'ring-4 ring-[#F5C542]/70' : ''} ${active ? 'node-today' : ''} ${locked ? '' : 'transition-transform group-active:translate-y-0.5 group-active:shadow-[0_3px_0_rgba(58,36,30,0.22)]'}`}>
      <span aria-hidden="true" className="absolute left-1/2 top-1 h-2.5 w-6 -translate-x-1/2 rounded-full bg-white/45 blur-[1px]" />
      <span className="relative flex items-center justify-center"><Glyph day={day} state={state} mile={mile} /></span>
    </span>
  );
  const label = (
    <span className={`pointer-events-none absolute left-1/2 top-[calc(100%+5px)] flex w-36 -translate-x-1/2 flex-col items-center rounded-pill px-2 py-1 text-center backdrop-blur-sm ${isToday ? 'bg-primary text-on-primary shadow-pop' : 'bg-surface/85 text-text shadow-soft'}`}>
      <span className={`text-caption font-bold ${isToday ? 'text-on-primary' : 'text-muted'}`}>{isToday ? 'HÔM NAY' : `Ngày ${day}`}{mile && !isToday ? (day === 21 ? ' · Đích' : ' · Cửa ải') : ''}</span>
      <span className={`line-clamp-1 text-caption font-semibold ${locked ? 'opacity-70' : ''}`}>{m.title}</span>
    </span>
  );

  if (locked) return <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2 opacity-90" style={style} aria-label={vi.map.nodeAria(day, m.title, look.text)} aria-disabled="true">{circle}{label}</div>;
  return <Link to={`/chapter/${day}`} className="group absolute z-20 -translate-x-1/2 -translate-y-1/2" style={style} aria-label={vi.map.nodeAria(day, m.title, look.text)}>{circle}{label}</Link>;
}

/** Bản đồ hành trình 21 ngày — MỘT con đường leo dốc liền mạch qua 3 vùng đất; Gumi luôn đứng ở chặng hiện tại. */
export function JourneyMap({ days, today }: { days: DayState[]; today: number }) {
  const meRef = useRef<HTMLDivElement>(null);
  useEffect(() => { meRef.current?.scrollIntoView({ block: 'center' }); }, []);

  const pts = days.map((_, i) => ({ x: xOf(i + 1), y: yOf(i + 1) }));
  let frontier = 0;
  days.forEach((s, i) => { if (reached(s)) frontier = i + 1; });
  const charDay = Math.min(Math.max(today, 1), N);
  const charState = days[charDay - 1] ?? 'future';

  return (
    <div className="relative w-full overflow-hidden rounded-card border border-white/50 shadow-soft" style={{ height: H }}>
      {/* Bối cảnh 3 vùng đất xếp chồng thành một sườn núi */}
      {BANDS.map((b) => (
        <div key={b.act} className="absolute inset-x-0 overflow-hidden" style={{ top: b.top, height: b.height }}>
          <RegionScene act={b.act} />
        </div>
      ))}

      {/* Nhãn vùng đất */}
      {BANDS.map((b) => {
        const a = vi.story.acts[b.act - 1]!;
        return (
          <div key={`lbl-${b.act}`} className="absolute left-3 z-10 flex items-center gap-2 rounded-pill bg-surface/85 px-3 py-1 shadow-soft backdrop-blur" style={{ top: b.top + 12 }}>
            <span aria-hidden="true" className="text-body">{a.icon}</span>
            <span><span className="block text-caption font-bold text-primary leading-none">HỒI {b.act} · {a.range}</span><span className="block text-small font-extrabold leading-tight">{a.name}</span></span>
          </div>
        );
      })}

      {/* Con đường liền mạch */}
      <svg className="absolute inset-0 z-10 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="road" gradientUnits="userSpaceOnUse" x1="0" y1={H} x2="0" y2="0">
            <stop offset="0" stopColor="#FA990A" /><stop offset="0.5" stopColor="#B83556" /><stop offset="1" stopColor="#55768C" />
          </linearGradient>
        </defs>
        <path d={pathThrough(pts)} fill="none" stroke="rgba(58,36,30,0.18)" strokeWidth="17" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={pathThrough(pts)} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="10" strokeLinecap="round" strokeDasharray="0.1 15" vectorEffect="non-scaling-stroke" />
        {frontier >= 2 && <path d={pathThrough(pts.slice(0, frontier))} fill="none" stroke="url(#road)" strokeWidth="11" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      </svg>

      {/* Cờ ĐÍCH ở đỉnh */}
      <div className="absolute left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-pill bg-primary px-4 py-1.5 text-on-primary shadow-pop" style={{ top: 34 }}>
        <Icon name="trophy" size={16} filled /><span className="text-small font-extrabold">ĐÍCH · Chiến Thần 0%</span>
      </div>

      {/* Các chặng */}
      {days.map((state, i) => <Node key={i + 1} day={i + 1} state={state} isToday={i + 1 === today} />)}

      {/* Gumi đang đứng trên đường tại chặng hiện tại */}
      <div ref={meRef} className="pointer-events-none absolute z-30 -translate-x-1/2" style={{ left: `${(xOf(charDay) / W) * 100}%`, top: `${yOf(charDay) - 82}px` }}>
        <Gumi state={charState === 'dying' ? 'hap_hoi' : 'bo_pho'} size={64} />
      </div>

      {/* Vạch xuất phát ở chân núi */}
      <div className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-pill bg-surface/90 px-4 py-1 shadow-soft backdrop-blur" style={{ top: H - 40 }}>
        <Icon name="flag" size={15} className="text-primary" /><span className="text-small font-bold text-text">Xuất phát</span>
      </div>
    </div>
  );
}
