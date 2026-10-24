import { canEnterMission } from '../lib/missionAccess';
import { Component, memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { vi } from '../content/vi';
import { isMilestone, TOTAL_DAYS, ACT_STARTS } from '../lib/scoring';
import { getQuality } from '../lib/quality';
import { Gumi } from './Gumi';
import { Icon } from './Icon';
import type { DayState } from '../api/types';

export class MapErrorBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center text-white/80">
        <span className="text-[32px]">🗺️</span>
        <p className="text-small font-semibold">Không tải được bản đồ.</p>
        <button className="rounded-pill bg-white/20 px-5 py-2 text-small font-bold" onClick={() => this.setState({ err: false })}>Thử lại</button>
      </div>
    );
    return this.state.err ? null : this.props.children;
  }
}

/* ---- Con đường leo núi: Ngày 1 ở DƯỚI (xuất phát) → Ngày cuối ở TRÊN (đích). Một con đường liền mạch. ---- */
const W = 420;
const RH = 104;        // khoảng cách dọc giữa 2 chặng
const TOP = 200;       // chừa chỗ cho cờ ĐÍCH + Gumi đứng ở đỉnh (ngày cuối) không đè lên nhau
const N = TOTAL_DAYS;
const H = TOP + (N - 1) * RH + 128;
const yOf = (day: number) => TOP + (N - day) * RH;
// Biên độ lệch ngang vừa phải (±96/420 ≈ ±23%) để pill nhãn node KHÔNG bị cắt mép trên máy hẹp.
const xOf = (day: number) => (isMilestone(day) ? 210 : 210 + 96 * Math.sin(day * 0.8 + 0.4));
const reached = (s: DayState) => s === 'checked' || s === 'passed' || s === 'open' || s === 'dying';

// Ranh giới 2 vùng đất (theo y): trên là Rừng Đường Ẩn (Hồi 2, ngày 8–14), dưới là Đầm Lầy Ngọt (Hồi 1, ngày 1–7).
const B12 = (yOf(ACT_STARTS[1]! - 1) + yOf(ACT_STARTS[1]!)) / 2; // giữa Hồi 1 (ngày 7) và Hồi 2 (ngày 8)
const BANDS = [
  { act: 2 as const, top: 0, height: B12 },
  { act: 1 as const, top: B12, height: H - B12 },
];

// Nền 2 vùng đất — GRADIENT PHẲNG TĨNH (không hạt/sương/parallax) cho nhẹ trên mọi máy.
const BAND_BG: Record<1 | 2, string> = {
  1: 'linear-gradient(180deg, #4FB08C 0%, #1E8069 55%, #0E4F41 100%)', // Đầm Lầy Ngọt (xanh lá)
  2: 'linear-gradient(180deg, #8B6FB0 0%, #5B4E90 55%, #2C2456 100%)', // Rừng Đường Ẩn (tím)
};
// Màu đặc cho gfx-low: tránh GPU rasterize 2 lớp gradient 2000px+
const BAND_BG_LOW: Record<1 | 2, string> = { 1: '#1E8069', 2: '#5B4E90' };

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
const Glyph = memo(function Glyph({ day, state, mile }: { day: number; state: DayState; mile: boolean }) {
  if (mile) {
    if (state === 'future') return <Icon name="lock" size={22} />;
    return day === TOTAL_DAYS ? <Icon name="trophy" size={26} filled /> : <Icon name="star" size={24} filled />;
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
});

function pathThrough(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!, mx = (a.x + b.x) / 2;
    d += ` C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
  }
  return d;
}

const Node = memo(function Node({ day, state, isToday, replayAll }: { day: number; state: DayState; isToday: boolean; replayAll?: boolean }) {
  const mile = isMilestone(day);
  const m = vi.missions[day - 1] ?? { title: `Ngày ${day}`, kind: 'GAME' as const }; // guard: không bao giờ crash nếu lệch ngày
  const look = NODE[replayAll && state === 'future' ? 'open' : state];
  const locked = state === 'future' && !replayAll;
  // Tester/QA vào mọi màn; người thường theo trạng thái tiến độ.
  const active = canEnterMission(state, replayAll);
  const size = mile ? 'h-[76px] w-[76px] text-title' : 'h-[58px] w-[58px] text-body';
  const style = { left: `${(xOf(day) / W) * 100}%`, top: `${yOf(day)}px` };

  const circle = (
    <span className={`jn-btn relative flex ${size} items-center justify-center rounded-full border-[3px] font-extrabold shadow-[0_5px_0_rgba(58,36,30,0.22)] ${look.face} ${mile ? 'ring-4 ring-[#F5C542]/70' : ''} ${active ? 'node-today' : ''} ${locked ? '' : 'transition-transform group-active:translate-y-0.5 group-active:shadow-[0_3px_0_rgba(58,36,30,0.22)]'}`}>
      <span aria-hidden="true" className="absolute left-1/2 top-1 h-2.5 w-6 -translate-x-1/2 rounded-full bg-white/45 blur-[1px]" />
      <span className="relative flex items-center justify-center"><Glyph day={day} state={replayAll && state === 'future' ? 'open' : state} mile={mile} /></span>
    </span>
  );
  const label = (
    <span className={`pointer-events-none absolute left-1/2 top-[calc(100%+5px)] flex w-32 max-w-[46vw] -translate-x-1/2 flex-col items-center rounded-pill px-2.5 py-1 text-center backdrop-blur-sm ${isToday ? 'bg-primary text-on-primary shadow-pop' : 'bg-surface/85 text-text shadow-soft'}`}>
      <span className={`text-caption font-bold ${isToday ? 'text-on-primary' : 'text-muted'}`}>{isToday ? 'HÔM NAY' : `Ngày ${day}`}{mile && !isToday ? (day === TOTAL_DAYS ? ' · Đích' : ' · Cửa ải') : ''}</span>
      <span className={`line-clamp-1 text-caption font-semibold ${locked ? 'opacity-70' : ''}`}>{m.title}</span>
    </span>
  );

  // Giữ trạng thái tiến độ khi hiển thị, quyền vào màn được tính riêng.
  if (!active) return <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2 opacity-90" style={style} aria-label={vi.map.nodeAria(day, m.title, look.text)} aria-disabled="true">{circle}{label}</div>;
  return <Link to={`/chapter/${day}`} className="group absolute z-20 -translate-x-1/2 -translate-y-1/2" style={style} aria-label={vi.map.nodeAria(day, m.title, look.text)}>{circle}{label}</Link>;
});

/** Bản đồ hành trình — con đường leo dốc 2D NHẸ: nền gradient PHẲNG TĨNH, không hạt/sương/parallax.
 * memo với custom comparator: ngăn 21 Node re-render khi Dashboard đổi tab/dialog/event mà data không thay đổi. */
export const JourneyMap = memo(function JourneyMap({ days, today, replayAll }: { days: DayState[]; today: number; replayAll?: boolean }) {
  const meRef = useRef<HTMLDivElement>(null);
  // Gumi SVG (61 paths) render SAU khi map đã paint xong — không chặn frame đầu tiên.
  // Placeholder emoji hiện ngay, rIC swap sang Gumi thật khi browser rảnh (≤ 2s).
  const [gumiMounted, setGumiMounted] = useState(false);

  useEffect(() => {
    const el = meRef.current;
    if (!el) return;
    // Dùng rAF để đợi layout xong, bọc try-catch phòng Android Chrome cũ throw
    requestAnimationFrame(() => {
      try { el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }); } catch { /* safe */ }
    });
  }, []);

  useEffect(() => {
    // Defer Gumi SVG đến khi browser rảnh để không block paint map
    const cb = () => setGumiMounted(true);
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(cb, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(cb, 0);
    return () => clearTimeout(id);
  }, []);

  const lowGfx = getQuality().tier === 'low';
  // useMemo: pts + frontier chỉ tính lại khi nội dung days thực sự thay đổi
  const pts = useMemo(() => days.map((_, i) => ({ x: xOf(i + 1), y: yOf(i + 1) })), [days]);
  const frontier = useMemo(() => { let f = 0; days.forEach((s, i) => { if (reached(s)) f = i + 1; }); return f; }, [days]);
  const charDay = Math.min(Math.max(today, 1), N);
  const charState = days[charDay - 1] ?? 'future';

  return (
    <div className="journey-world relative w-full overflow-hidden" style={{ height: H }}>
      {/* Nền 2 vùng đất — gradient PHẲNG TĨNH (nhẹ, không hạt/sương/parallax)
          gfx-low dùng màu đặc để tránh GPU rasterize 2 lớp gradient 2000px+ trên máy Helio G80 */}
      {BANDS.map((b) => (
        <div key={b.act} aria-hidden="true" className="absolute inset-x-0" style={{ top: b.top, height: b.height, background: lowGfx ? BAND_BG_LOW[b.act] : BAND_BG[b.act] }} />
      ))}

      {/* Nhãn vùng đất */}
      {BANDS.map((b) => {
        const a = vi.story.acts[b.act - 1];
        if (!a) return null;
        return (
          <div key={`lbl-${b.act}`} className="absolute left-3 z-10 flex items-center gap-2 rounded-pill bg-surface/85 px-3 py-1 shadow-soft backdrop-blur" style={{ top: b.top + 12 }}>
            <span aria-hidden="true" className="text-body">{a.icon}</span>
            <span><span className="block text-caption font-bold text-primary leading-none">HỒI {b.act} · {a.range}</span><span className="block text-small font-extrabold leading-tight">{a.name}</span></span>
          </div>
        );
      })}

      {/* Con đường liền mạch — gfx-low ẩn SVG hoàn toàn để tiết kiệm bộ nhớ GPU rasterization */}
      {!lowGfx && (
        <svg className="absolute inset-0 z-10 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="road" gradientUnits="userSpaceOnUse" x1="0" y1={H} x2="0" y2="0">
              <stop offset="0" stopColor="#FA990A" /><stop offset="0.5" stopColor="#B83556" /><stop offset="1" stopColor="#55768C" />
            </linearGradient>
          </defs>
          <path d={pathThrough(pts)} fill="none" stroke="rgba(24,30,44,0.3)" strokeWidth="23" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={pathThrough(pts)} fill="none" stroke="rgba(255,255,255,0.76)" strokeWidth="15" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={pathThrough(pts)} fill="none" stroke="rgba(91,70,72,0.26)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 15" vectorEffect="non-scaling-stroke" />
          {frontier >= 2 && <path className="jroad-flow" d={pathThrough(pts.slice(0, frontier))} fill="none" stroke="url(#road)" strokeWidth="14" strokeLinecap="round" strokeDasharray="1 13" vectorEffect="non-scaling-stroke" />}
        </svg>
      )}

      {/* Cờ ĐÍCH ở đỉnh */}
      <div className="absolute left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-pill bg-primary px-4 py-1.5 text-on-primary shadow-pop" style={{ top: 34 }}>
        <Icon name="trophy" size={16} filled /><span className="text-small font-extrabold">ĐÍCH · Chiến Thần 0%</span>
      </div>

      {/* Các chặng */}
      {days.map((state, i) => <Node key={i + 1} day={i + 1} state={state} isToday={i + 1 === today} replayAll={replayAll} />)}

      {/* Anchor scroll — LUÔN visible, scrollIntoView cuộn đúng giữa màn */}
      <div ref={meRef} aria-hidden="true" className="pointer-events-none absolute" style={{ left: `${(xOf(charDay) / W) * 100}%`, top: `${yOf(charDay)}px`, width: 1, height: 1 }} />

      {/* Gumi trên bản đồ — async deferred: emoji placeholder hiện ngay, SVG 61 paths swap vào
          sau khi browser rảnh (requestIdleCallback) để không chặn paint frame đầu của map. */}
      <div className="pointer-events-none absolute z-30 -translate-x-1/2" style={{ left: `${(xOf(charDay) / W) * 100}%`, top: `${yOf(charDay) - 144}px` }}>
        {gumiMounted
          ? <Gumi state={charState === 'dying' ? 'hap_hoi' : 'bo_pho'} size={120} />
          : <span className="flex h-[120px] w-[120px] items-center justify-center text-[52px] leading-none drop-shadow-md" aria-hidden="true">🐱</span>
        }
      </div>

      {/* Vạch xuất phát ở chân núi */}
      <div className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-pill bg-surface/90 px-4 py-1 shadow-soft backdrop-blur" style={{ top: H - 40 }}>
        <Icon name="flag" size={15} className="text-primary" /><span className="text-small font-bold text-text">Xuất phát</span>
      </div>
    </div>
  );
// Custom comparator: so sánh từng phần tử của days để tránh re-render khi Dashboard tạo array mới nhưng nội dung y hệt
}, (prev, next) =>
  prev.today === next.today &&
  prev.replayAll === next.replayAll &&
  prev.days.length === next.days.length &&
  prev.days.every((s, i) => s === next.days[i])
);
