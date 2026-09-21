import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { vi } from '../content/vi';
import { actOfDay, isBossDay, type DayState } from '../mock/scenarios';

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

function ActBand({ act }: { act: 1 | 2 | 3 }) {
  const a = vi.story.acts[act - 1]!;
  const ui = ACT_UI[act];
  return (
    <li className="relative z-10 my-1" aria-label={vi.map.actAria(a.name)}>
      <div className={`flex items-center gap-3 rounded-card border-2 px-4 py-3 ${ui.band}`}>
        <span aria-hidden="true" className="text-headline">{ui.icon}</span>
        <div className="min-w-0">
          <p className="text-caption font-semibold text-muted">HỒI {act} · {a.range}</p>
          <p className="text-title font-bold leading-tight">{a.name}</p>
          <p className="text-caption text-muted">{a.blurb}</p>
        </div>
      </div>
    </li>
  );
}

function Node({ day, state, isToday, side }: { day: number; state: DayState; isToday: boolean; side: 'left' | 'right' }) {
  const boss = isBossDay(day);
  const m = vi.missions[day - 1]!;
  const look = NODE[state];
  const locked = state === 'future';
  const active = state === 'open' || state === 'dying';
  const size = boss ? 'h-16 w-16 text-title' : 'h-14 w-14 text-body';
  const glyph = boss ? (locked ? '🔒' : '⚔️') : (look.glyph || String(day));

  const circle = (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-pill border-2 font-bold shadow-sm ${look.ring} ${active ? 'node-today ring-2 ring-primary ring-offset-2' : ''}`}
    >
      {glyph}
    </span>
  );
  const label = (
    <span className={`flex min-w-0 max-w-[9rem] flex-col ${side === 'left' ? 'items-end text-right' : 'items-start text-left'}`}>
      <span className="text-caption font-semibold text-muted">Ngày {day}{boss ? ' · Cửa ải' : ''}</span>
      <span className={`line-clamp-2 text-small font-semibold ${locked ? 'text-muted' : 'text-text'}`}>{m.title}</span>
      {isToday && <span className="mt-0.5 rounded-pill bg-primary px-2 py-0.5 text-caption font-bold text-on-primary">HÔM NAY</span>}
    </span>
  );

  const inner = side === 'left' ? <>{label}{circle}</> : <>{circle}{label}</>;
  const rowCls = `flex items-center gap-3 ${side === 'left' ? 'justify-end pr-1' : 'justify-start pl-1'}`;

  if (locked) {
    return <div className={rowCls} aria-label={vi.map.nodeAria(day, m.title, look.text)} aria-disabled="true">{inner}</div>;
  }
  return (
    <Link
      to={`/chapter/${day}`}
      aria-label={vi.map.nodeAria(day, m.title, look.text)}
      className={`${rowCls} rounded-card transition-transform active:scale-95`}
    >
      {inner}
    </Link>
  );
}

/** Bản đồ hành trình 21 ngày: đường mòn dọc, 3 vùng đất, chặng zig-zag, cửa ải ở 7/14/21. */
export function JourneyMap({ days, today }: { days: DayState[]; today: number }) {
  const rows: ReactElement[] = [];
  for (let i = 0; i < days.length; i++) {
    const day = i + 1;
    const state = days[i]!;
    if (day === 1 || day === 8 || day === 15) rows.push(<ActBand key={`act-${day}`} act={actOfDay(day)} />);

    const boss = isBossDay(day);
    if (boss) {
      rows.push(
        <li key={day} className="relative z-10 flex justify-center py-2">
          <div className="w-full max-w-xs">
            <Node day={day} state={state} isToday={day === today} side="right" />
          </div>
        </li>,
      );
      continue;
    }
    const side: 'left' | 'right' = day % 2 === 1 ? 'left' : 'right';
    rows.push(
      <li key={day} className="relative z-10 grid grid-cols-2 items-center py-2">
        <div className="flex justify-end">{side === 'left' && <Node day={day} state={state} isToday={day === today} side="left" />}</div>
        <div className="flex justify-start">{side === 'right' && <Node day={day} state={state} isToday={day === today} side="right" />}</div>
      </li>,
    );
  }

  return (
    <div className="relative">
      <span aria-hidden="true" className="trail-spine" />
      <ol className="relative flex flex-col" aria-label={`Hành trình ${vi.journey.total} ngày`}>{rows}</ol>
    </div>
  );
}
