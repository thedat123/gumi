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
  const { stop } = useNarration();

  // "Bắt đầu chơi": vào màn hôm nay là điểm danh streak (idempotent — chỉ tính 1 lần/ngày).
  useEffect(() => { void api.markPlayed().catch(() => {}); }, []);

  // Không tự đọc cốt truyện nữa — người chơi tự bấm nút loa nếu muốn nghe. Vẫn tắt tiếng khi rời trang.
  useEffect(() => () => stop(), [day, stop]);

  if (!chapter || !m || day < 1 || day > TOTAL_DAYS) {
    return (
      <div className="flex flex-col items-center gap-3 pt-10 text-center">
        <Banner kind="error">Không có chương này.</Banner>
        <Link to="/journey" className="inline-flex min-h-11 items-center rounded-[16px] border border-black/10 grad-brand px-5 font-semibold text-on-primary">{vi.story.ui.backToMap}</Link>
      </div>
    );
  }

  const act = actOfDay(day);
  const a = vi.story.acts[act - 1]!;
  const big = isMilestone(day);

  return (
    <div className="relative -mx-4 -mb-6 -mt-1 flex min-h-[calc(100dvh-var(--app-header))] flex-col overflow-hidden px-4 pb-5 pt-3 lg:-mx-8 lg:px-8">
      <RegionScene act={act} />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Thanh trên: chương + thoát */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-pill bg-surface/85 px-3 py-1.5 shadow-soft backdrop-blur">
            <span aria-hidden="true" className="shrink-0">{a.icon}</span>
            <span className="shrink-0 whitespace-nowrap text-caption font-bold text-primary">{vi.story.ui.chapterOf(day)}</span>
            <span className="truncate text-caption font-semibold text-text">· {a.name}</span>
          </span>
          <Link to="/journey" className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-surface/85 px-3 py-1.5 text-caption font-semibold text-muted shadow-soft backdrop-blur transition-colors hover:text-primary">
            <Icon name="x" size={15} /> <span className="hidden sm:inline">{vi.story.ui.backToMap}</span>
          </Link>
        </div>

        {/* Mascot ở giữa (co gọn ở màn chiều cao nhỏ để chừa chỗ hội thoại) */}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center [@media(max-height:560px)]:flex-none [@media(max-height:560px)]:gap-1 [@media(max-height:560px)]:py-1 [@media(max-height:560px)]:[&_.gumi]:!w-[84px]">
          <Gumi state="bo_pho" size={140} interactive progress={(day - 1) / TOTAL_DAYS} />
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-3.5 py-1 text-caption font-bold text-on-primary shadow-pop">
            {big && <Icon name={day === TOTAL_DAYS ? 'trophy' : 'flag'} size={14} filled />}
            {big ? (day === TOTAL_DAYS ? 'TỐT NGHIỆP' : 'CỬA ẢI') : `Ngày ${day}`} · {m.title}
          </span>
        </div>

        {/* Panel thoại + CTA (kiểu visual-novel) */}
        <div className="beat rounded-card border border-white/60 bg-surface/92 p-4 shadow-pop backdrop-blur-md">
          <div className="flex flex-col gap-3 [@media(max-height:560px)]:max-h-[38vh] [@media(max-height:560px)]:overflow-y-auto [@media(max-height:560px)]:pr-1">
            {chapter.intro.map((line, i) => <DialogueLine key={i} line={line} />)}
          </div>
          <div className="mt-4">
            <Link to={`/mission/${day}`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-black/10 grad-brand px-5 font-bold text-on-primary shadow-pop transition-all hover:brightness-[1.06] active:scale-[0.98]">
              {vi.story.ui.startMission} <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
