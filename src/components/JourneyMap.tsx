import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { vi } from '../content/vi';
import { actOfDay, isMilestone } from '../lib/scoring';
import { RegionScene } from './RegionScene';
import type { DayState } from '../api/types';

// Lớp Tailwind viết đủ chữ (để bộ quét Tailwind nhận diện) cho từng vùng đất.
const ACT_UI: Record<1 | 2 | 3, { band: string; icon: string }> = {
  1: { band: 'bg-accent/12 border-accent/40', icon: '🫧' },
  2: { band: 'bg-success/12 border-success/40', icon: '🌫️' },
  3: { band: 'bg-info/12 border-info/40', icon: '🏔️' },
};

// Kiểu chấm mỗi ngày theo trạng thái: khác nhau bằng BIỂU TƯỢNG và CHỮ, không chỉ màu.
const NODE: Record<DayState, { ring: string; glyph: string; text: string }> = {
  checked: { ring: 'bg-success text-on-primary border-success', glyph: '✔', text: vi.day.checked },
  passed: { ring: 'bg-info text-on-primary border-info', glyph: '🛡', text: vi.day.passed },
  open: { ring: 'bg-accent text-on-accent border-primary', glyph: '', text: vi.day.today },
  dying: { ring: 'bg-danger text-on-primary border-danger', glyph: '!', text: vi.day.dying },
  missed: { ring: 'bg-surface text-muted border-border-strong', glyph: '✖', text: vi.day.missed },
  rejected: { ring: 'bg-surface text-danger border-danger', glyph: '↩', text: vi.day.rejected },
  future: { ring: 'bg-surface text-muted border-border', glyph: '🔒', text: vi.map.locked },
};

const isBig = (day: number): boolean => isMilestone(day);
const glyphOf = (day: number, state: DayState): string => {
  if (isBig(day)) return state === 'future' ? '🔒' : day === 21 ? '🏆' : '⭐';
  return NODE[state].glyph || String(day);
};
const tagOf = (day: number): string => (day === 21 ? ' · Tốt nghiệp' : isMilestone(day) ? ' · Cửa ải' : '');

function Circle({ day, state, size }: { day: number; state: DayState; size: string }) {
  const active = state === 'open' || state === 'dying';
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-pill border-2 font-bold shadow-soft ${NODE[state].ring} ${active ? 'node-today ring-2 ring-primary ring-offset-2' : ''}`}>
      {glyphOf(day, state)}
    </span>
  );
}

/* ---------------- Dọc (mobile) ---------------- */
function VNode({ day, state, isToday, side }: { day: number; state: DayState; isToday: boolean; side: 'left' | 'right' }) {
  const big = isBig(day);
  const m = vi.missions[day - 1]!;
  const locked = state === 'future';
  const circle = <Circle day={day} state={state} size={big ? 'h-16 w-16 text-title' : 'h-14 w-14 text-body'} />;
  const label = (
    <span className={`flex min-w-0 max-w-[9rem] flex-col ${side === 'left' ? 'items-end text-right' : 'items-start text-left'}`}>
      <span className="text-caption font-semibold text-muted">Ngày {day}{tagOf(day)}</span>
      <span className={`line-clamp-2 text-small font-semibold ${locked ? 'text-muted' : 'text-text'}`}>{m.title}</span>
      {isToday && <span className="mt-0.5 rounded-pill bg-primary px-2 py-0.5 text-caption font-bold text-on-primary">HÔM NAY</span>}
    </span>
  );
  const inner = side === 'left' ? <>{label}{circle}</> : <>{circle}{label}</>;
  const cls = `flex items-center gap-3 ${side === 'left' ? 'justify-end pr-1' : 'justify-start pl-1'}`;
  if (locked) return <div className={cls} aria-label={vi.map.nodeAria(day, m.title, NODE[state].text)} aria-disabled="true">{inner}</div>;
  return <Link to={`/chapter/${day}`} aria-label={vi.map.nodeAria(day, m.title, NODE[state].text)} className={`${cls} rounded-card transition-transform active:scale-95`}>{inner}</Link>;
}

function VerticalMap({ days, today }: { days: DayState[]; today: number }) {
  const rows: ReactElement[] = [];
  for (let i = 0; i < days.length; i++) {
    const day = i + 1;
    const state = days[i]!;
    if (day === 1 || day === 8 || day === 15) {
      const a = vi.story.acts[actOfDay(day) - 1]!;
      const ui = ACT_UI[actOfDay(day)];
      rows.push(
        <li key={`act-${day}`} className="relative z-10 my-1" aria-label={vi.map.actAria(a.name)}>
          <div className={`flex items-center gap-3 rounded-card border-2 px-4 py-3 ${ui.band}`}>
            <span aria-hidden="true" className="text-headline">{ui.icon}</span>
            <div className="min-w-0"><p className="text-caption font-semibold text-muted">HỒI {actOfDay(day)} · {a.range}</p><p className="text-title font-bold leading-tight">{a.name}</p><p className="text-caption text-muted">{a.blurb}</p></div>
          </div>
        </li>,
      );
    }
    if (isBig(day)) {
      rows.push(<li key={day} className="relative z-10 flex justify-center py-2"><div className="w-full max-w-xs"><VNode day={day} state={state} isToday={day === today} side="right" /></div></li>);
      continue;
    }
    const side: 'left' | 'right' = day % 2 === 1 ? 'left' : 'right';
    rows.push(
      <li key={day} className="relative z-10 grid grid-cols-2 items-center py-2">
        <div className="flex justify-end">{side === 'left' && <VNode day={day} state={state} isToday={day === today} side="left" />}</div>
        <div className="flex justify-start">{side === 'right' && <VNode day={day} state={state} isToday={day === today} side="right" />}</div>
      </li>,
    );
  }
  return (
    <div className="relative lg:hidden">
      <span aria-hidden="true" className="trail-spine" />
      <ol className="relative flex flex-col" aria-label={`Hành trình ${vi.journey.total} ngày`}>{rows}</ol>
    </div>
  );
}

/* ---------------- Ngang (desktop) ---------------- */
function HNode({ day, state, isToday, up }: { day: number; state: DayState; isToday: boolean; up: boolean }) {
  const big = isBig(day);
  const m = vi.missions[day - 1]!;
  const locked = state === 'future';
  const inner = (
    <>
      <Circle day={day} state={state} size={big ? 'h-16 w-16 text-title' : 'h-14 w-14 text-body'} />
      <span className="flex flex-col items-center gap-0.5 rounded-lg bg-surface/85 px-1.5 py-1 text-center shadow-soft backdrop-blur">
        <span className="text-caption font-semibold text-muted">Ngày {day}{tagOf(day)}</span>
        <span className={`line-clamp-2 text-caption font-semibold leading-tight ${locked ? 'text-muted' : 'text-text'}`}>{m.title}</span>
        {isToday && <span className="rounded-pill bg-primary px-2 text-caption font-bold text-on-primary">HÔM NAY</span>}
      </span>
    </>
  );
  const cls = `relative z-10 flex w-28 flex-col items-center gap-1.5 ${up ? '-translate-y-9' : 'translate-y-9'}`;
  if (locked) return <div className={cls} aria-label={vi.map.nodeAria(day, m.title, NODE[state].text)} aria-disabled="true">{inner}</div>;
  return <Link to={`/chapter/${day}`} aria-label={vi.map.nodeAria(day, m.title, NODE[state].text)} className={`${cls} transition-transform hover:-translate-y-10 active:scale-95`}>{inner}</Link>;
}

function Zone({ act, days, today }: { act: 1 | 2 | 3; days: DayState[]; today: number }) {
  const a = vi.story.acts[act - 1]!;
  const start = (act - 1) * 7; // ngày bắt đầu (0-based) của vùng
  const slice = days.slice(start, start + 7);
  return (
    <section className="relative flex min-h-[24rem] flex-shrink-0 overflow-hidden rounded-card border border-border shadow-soft lg:min-h-[28rem]" aria-label={vi.map.actAria(a.name)}>
      <RegionScene act={act} />
      <div className="relative z-10 flex h-full flex-col px-8 pb-8 pt-5">
        <p className="mb-1 inline-flex w-fit items-center gap-2 rounded-pill bg-surface/85 px-3 py-1 text-small font-bold text-text shadow-soft backdrop-blur">
          <span aria-hidden="true">{a.icon}</span>HỒI {act} · {a.name}
        </p>
        <div className="relative flex flex-1 items-center gap-5 pl-1 pr-3">
          <span aria-hidden="true" className="trail-spine-h" />
          {slice.map((state, i) => (
            <HNode key={start + i + 1} day={start + i + 1} state={state} isToday={start + i + 1 === today} up={i % 2 === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HorizontalMap({ days, today }: { days: DayState[]; today: number }) {
  return (
    <div className="hidden lg:block">
      <div className="overflow-x-auto pb-3">
        <div className="flex min-w-max items-stretch gap-4" aria-label={`Hành trình ${vi.journey.total} ngày`}>
          <Zone act={1} days={days} today={today} />
          <Zone act={2} days={days} today={today} />
          <Zone act={3} days={days} today={today} />
        </div>
      </div>
      <p className="mt-1 text-center text-caption text-muted">Kéo ngang để đi tiếp hành trình →</p>
    </div>
  );
}

/** Bản đồ hành trình 21 ngày. Mobile: đường mòn dọc. Desktop: cuộn NGANG qua 3 vùng đất có bối cảnh động. */
export function JourneyMap({ days, today }: { days: DayState[]; today: number }) {
  return (
    <>
      <VerticalMap days={days} today={today} />
      <HorizontalMap days={days} today={today} />
    </>
  );
}
