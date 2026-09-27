import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { vi } from '../content/vi';
import { playSfx } from '../lib/sfx';
import { Banner } from './Banner';
import { ChapterTease } from './ChapterTease';
import { Gumi } from './Gumi';

/** Nhịp KẾT nhiệm vụ dùng chung cho các minigame: Gumi ăn mừng + báo điểm + hé lộ ngày mai. */
export function MissionDone({ day, points, note }: { day: number; points: number; note?: string }) {
  useEffect(() => { playSfx('win'); }, []);
  return (
    <div className="flex flex-col items-center gap-3 pt-4 text-center">
      <Gumi state="bo_pho" size={150} progress={day / vi.journey.total} event="cheer" eventKey={1} />
      <Banner kind="success">{vi.checkin.success(points)}</Banner>
      {note && <p className="text-small text-muted">{note}</p>}
      <ChapterTease day={day} />
      <div className="mt-1 flex w-full max-w-xs flex-col items-stretch gap-2 sm:max-w-md sm:flex-row">
        <Link to="/journey" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-control bg-primary px-5 font-semibold text-on-primary shadow-pop">{vi.minigames.common.backHome}</Link>
        <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong/50 bg-surface px-5 font-semibold text-muted">{vi.minigames.common.backToRoom}</Link>
      </div>
    </div>
  );
}
