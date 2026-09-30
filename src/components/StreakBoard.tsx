import { Icon } from './Icon';
import { StreakFlame } from './StreakFlame';
import { STREAK_BONUS } from '../lib/scoring';
import { vi } from '../content/vi';
import type { DayState } from '../api/types';

const BONUS_DAYS = new Set(STREAK_BONUS.map((b) => b.n));
const isDone = (s: DayState) => s === 'checked' || s === 'passed';

/**
 * Bảng chuỗi ngày — thay cho con số streak: 21 ô chia theo 3 hồi (7 ngày/hồi).
 * Ô đã hoàn thành sáng màu lửa (chuỗi liền mạch nhìn thấy được), đỉnh chuỗi có ngọn 🔥,
 * ngày mốc thưởng có ngôi sao, hôm nay có viền nhấp nháy.
 */
export function StreakBoard({ days, today, streak }: { days: DayState[]; today: number; streak: number }) {
  // Đỉnh chuỗi = ô hoàn thành cuối cùng → gắn ngọn lửa.
  let tip = -1;
  days.forEach((s, i) => { if (isDone(s)) tip = i; });
  const doneCount = days.filter(isDone).length;
  const next = STREAK_BONUS.find((b) => b.n > streak);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-caption font-bold text-muted">
          <StreakFlame size={18} />
          {vi.journey.streakLabel}
        </span>
        <span className="flex items-center gap-1 text-caption font-semibold text-muted/80">
          {next ? (
            <><Icon name="star" size={11} filled className="text-accent" />{vi.journey.nextBonus(next.n, next.pts)}</>
          ) : vi.journey.allBonus}
        </span>
      </div>
      <div className="flex items-end gap-[3px]" role="img" aria-label={vi.journey.streakAria(doneCount)}>
        {days.map((s, i) => {
          const day = i + 1;
          const done = isDone(s);
          const isToday = day === today;
          const missed = s === 'missed' || s === 'rejected';
          const dying = s === 'dying';
          const bonus = BONUS_DAYS.has(day);

          let cls = 'bg-black/[0.06]'; // tương lai / mặc định
          if (missed) cls = 'bg-danger/25';
          if (isToday && !done && !dying) cls = 'bg-gradient-to-b from-[#FDE68A] to-[#FBBF24]';
          if (done) cls = 'bg-gradient-to-b from-[#FFC24B] to-[#F97316] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]';
          if (dying) cls = 'bg-gradient-to-b from-[#F87171] to-[#DC2626] animate-pulse';

          return (
            <div
              key={day}
              title={`Ngày ${day}${bonus ? ' · mốc thưởng chuỗi' : ''}`}
              className={`relative h-7 flex-1 rounded-[6px] transition-colors ${cls} ${day === 8 || day === 15 ? 'ml-1.5' : ''} ${isToday ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface' : ''}`}
            >
              {bonus && (
                <span aria-hidden="true" className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Icon name="star" size={10} filled className={done ? 'text-amber-300' : 'text-amber-400/70'} />
                </span>
              )}
              {i === tip && (
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
                  <StreakFlame size={20} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
