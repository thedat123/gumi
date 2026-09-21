import { Link, useParams } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { DialogueLine } from '../components/Dialogue';
import { Gumi } from '../components/Gumi';
import { RegionScene } from '../components/RegionScene';
import { vi } from '../content/vi';
import { actOfDay, isMilestone, TOTAL_DAYS } from '../lib/scoring';

/** Nhịp MỞ CHƯƠNG: kể chuyện Gumi/Boss Đường rồi dẫn vào nhiệm vụ thật (/mission/:day). */
export function ChapterIntro() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam);
  const chapter = vi.story.chapters[day - 1];
  const m = vi.missions[day - 1];

  if (!chapter || !m || day < 1 || day > TOTAL_DAYS) {
    return (
      <div className="flex flex-col items-center gap-3 pt-10 text-center">
        <Banner kind="error">Không có chương này.</Banner>
        <Link to="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.story.ui.backToMap}</Link>
      </div>
    );
  }

  const act = actOfDay(day);
  const a = vi.story.acts[act - 1]!;
  const big = isMilestone(day);

  return (
    <div className="relative -mx-4 -mt-2 flex min-h-[82dvh] flex-col gap-4 overflow-hidden rounded-b-card px-4 pb-4 pt-3 lg:-mx-8 lg:rounded-card lg:px-8">
      <RegionScene act={act} />

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-caption font-bold text-primary">{vi.story.ui.chapterOf(day)}</p>
          <p className="text-caption font-semibold text-text">{a.icon} {a.name}</p>
        </div>
        <Link to="/" className="rounded-pill bg-surface/80 px-3 py-1 text-caption font-semibold text-muted shadow-soft backdrop-blur">✕ {vi.story.ui.backToMap}</Link>
      </div>

      <div className="beat relative z-10 flex flex-1 flex-col gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <Gumi state="bo_pho" size={150} interactive progress={(day - 1) / TOTAL_DAYS} />
          <span className="rounded-pill bg-surface px-3 py-1 text-caption font-bold text-primary shadow-pop">{big ? (day === TOTAL_DAYS ? '🏆 TỐT NGHIỆP' : '⚔️ CỬA ẢI') : `Ngày ${day}`} · {m.title}</span>
        </div>

        <div className="flex flex-col gap-3 lg:mx-auto lg:w-full lg:max-w-lg">
          {chapter.intro.map((line, i) => <DialogueLine key={i} line={line} />)}
        </div>

        <div className="mt-auto flex flex-col gap-2 lg:mx-auto lg:w-full lg:max-w-md">
          <Link to={`/mission/${day}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-5 font-semibold text-on-primary shadow-pop">{vi.story.ui.startMission}</Link>
          <Link to={`/mission/${day}`} className="inline-flex min-h-11 items-center justify-center rounded-pill bg-surface/75 px-4 text-small font-semibold text-muted shadow-soft backdrop-blur">{vi.story.ui.skip}</Link>
        </div>
      </div>
    </div>
  );
}
