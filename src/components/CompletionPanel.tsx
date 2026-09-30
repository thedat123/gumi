import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { vi } from '../content/vi';
import { actOfDay } from '../lib/scoring';
import { ChapterTease } from './ChapterTease';
import { GameShell } from './GameShell';
import { Gumi } from './Gumi';
import { Icon } from './Icon';
import { SugarFactPopup } from './SugarFactPopup';

export function CompletionPanel({ day, points, note, children, action }: {
  day: number; points: number; note?: string; children?: ReactNode; action?: ReactNode;
}) {
  const mission = vi.missions[day - 1];
  return <GameShell act={actOfDay(day)} title={`Ngày ${day}: Hoàn thành!`} intro={mission?.title}>
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 py-3">
      <div className="relative overflow-hidden rounded-[28px] border border-white/75 bg-gradient-to-br from-white via-[#FFF7F0] to-[#F9E4EB] p-5 text-center shadow-[0_18px_50px_rgba(80,39,59,.2)] sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/25 blur-3xl" />
        <span className="relative inline-flex items-center gap-1.5 rounded-pill bg-success/12 px-3 py-1 text-xs font-black uppercase tracking-[.14em] text-success"><Icon name="sparkle" size={15} filled /> THỬ THÁCH HOÀN THÀNH</span>
        <div className="relative mx-auto mt-2 w-fit"><Gumi state={day === 21 ? 'tien_hoa' : 'bo_pho'} size={140} progress={day / vi.journey.total} event="cheer" eventKey={1} /></div>
        <p className="relative text-sm font-bold text-muted">{mission?.title}</p>
        <p className="relative mt-1 text-4xl font-black tracking-tight text-primary">+{points} <span className="text-lg">điểm</span></p>
        {note && <p className="relative mx-auto mt-2 max-w-sm text-small leading-relaxed text-muted">{note}</p>}
        {children && <div className="relative mt-3 text-left">{children}</div>}
      </div>
      <SugarFactPopup day={day} />
      <ChapterTease day={day} />
      {action ?? <div className="grid grid-cols-2 gap-2">
        <Link to="/journey" className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-3 text-center text-small font-bold text-on-primary shadow-pop">Về bản đồ</Link>
        <Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-control border border-border bg-surface px-3 text-center text-small font-bold text-text shadow-soft">Về phòng Gumi</Link>
      </div>}
    </div>
  </GameShell>;
}
