import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { DialogueLine } from '../components/Dialogue';
import { Gumi } from '../components/Gumi';
import { Icon } from '../components/Icon';
import { RegionScene } from '../components/RegionScene';
import { vi } from '../content/vi';
import { useNarration } from '../lib/narration';
import { actOfDay, isMilestone, TOTAL_DAYS } from '../lib/scoring';

/** Nhịp MỞ CHƯƠNG: kể chuyện Gumi/Boss Đường rồi dẫn vào nhiệm vụ thật (/mission/:day). */
export function ChapterIntro() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam);
  const chapter = vi.story.chapters[day - 1];
  const m = vi.missions[day - 1];
  const { speak, stop, speaking, supported } = useNarration();

  // "Bắt đầu chơi": vào màn hôm nay là điểm danh streak (idempotent — chỉ tính 1 lần/ngày).
  useEffect(() => { void api.markPlayed().catch(() => {}); }, []);

  // Tự đọc cốt truyện khi vừa vào chương (điều hướng tới đây tính là một cú bấm → trình duyệt cho phát tiếng). Dừng khi rời trang.
  useEffect(() => {
    if (!chapter) return;
    const id = setTimeout(() => speak(chapter.intro), 350);
    return () => { clearTimeout(id); stop(); };
  }, [day, chapter, speak, stop]);

  if (!chapter || !m || day < 1 || day > TOTAL_DAYS) {
    return (
      <div className="flex flex-col items-center gap-3 pt-10 text-center">
        <Banner kind="error">Không có chương này.</Banner>
        <Link to="/journey" className="inline-flex min-h-11 items-center rounded-control border border-black/15 bg-primary px-5 font-semibold text-on-primary">{vi.story.ui.backToMap}</Link>
      </div>
    );
  }

  const act = actOfDay(day);
  const a = vi.story.acts[act - 1]!;
  const big = isMilestone(day);

  return (
    <div className="relative -mx-4 -mb-6 -mt-1 flex min-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden px-4 pb-5 pt-3 lg:-mx-8 lg:px-8">
      <RegionScene act={act} />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Thanh trên: chương + thoát */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-pill bg-surface/85 px-3 py-1.5 shadow-soft backdrop-blur">
            <span aria-hidden="true">{a.icon}</span>
            <span className="text-caption font-bold text-primary">{vi.story.ui.chapterOf(day)}</span>
            <span className="text-caption font-semibold text-text">· {a.name}</span>
          </span>
          <Link to="/journey" className="inline-flex items-center gap-1.5 rounded-pill bg-surface/85 px-3 py-1.5 text-caption font-semibold text-muted shadow-soft backdrop-blur transition-colors hover:text-primary">
            <Icon name="x" size={15} /> {vi.story.ui.backToMap}
          </Link>
        </div>

        {/* Mascot ở giữa */}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
          <Gumi state="bo_pho" size={140} interactive progress={(day - 1) / TOTAL_DAYS} />
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-3.5 py-1 text-caption font-bold text-on-primary shadow-pop">
            {big && <Icon name={day === TOTAL_DAYS ? 'trophy' : 'flag'} size={14} filled />}
            {big ? (day === TOTAL_DAYS ? 'TỐT NGHIỆP' : 'CỬA ẢI') : `Ngày ${day}`} · {m.title}
          </span>
        </div>

        {/* Panel thoại + CTA (kiểu visual-novel) */}
        <div className="beat rounded-card border border-white/60 bg-surface/92 p-4 shadow-pop backdrop-blur-md">
          {supported && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => (speaking ? stop() : speak(chapter.intro))}
                aria-pressed={speaking}
                className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-caption font-bold shadow-soft transition-colors ${speaking ? 'bg-primary text-on-primary' : 'bg-surface text-primary ring-1 ring-primary/30 hover:bg-primary/5'}`}
              >
                <Icon name="volume" size={15} filled />
                {speaking ? vi.story.ui.narrateStop : vi.story.ui.narrate}
              </button>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {chapter.intro.map((line, i) => <DialogueLine key={i} line={line} />)}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            <Link to={`/mission/${day}`} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control border border-black/15 bg-primary px-5 font-bold text-on-primary shadow-pop transition-all hover:brightness-[1.06] active:scale-[0.98]">
              {vi.story.ui.startMission} <Icon name="arrow-right" size={18} />
            </Link>
            <Link to={`/mission/${day}`} className="inline-flex min-h-12 items-center justify-center rounded-control border border-border-strong/40 bg-surface px-5 text-small font-semibold text-muted transition-colors hover:text-text sm:flex-none">
              {vi.story.ui.skip}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
