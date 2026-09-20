import { vi } from '../content/vi';
import type { DayState } from '../api/types';

const LOOK: Record<DayState, { glyph: string; ring: string; text: string }> = {
  checked: { glyph: '✔', ring: 'bg-success text-on-primary border-success', text: vi.day.checked },
  passed: { glyph: '🛡', ring: 'bg-pink text-on-pink border-pink', text: vi.day.passed },
  open: { glyph: '●', ring: 'bg-accent text-on-accent border-accent', text: vi.day.open },
  dying: { glyph: '!', ring: 'bg-danger text-on-primary border-danger', text: vi.day.dying },
  missed: { glyph: '✖', ring: 'bg-surface text-muted border-border-strong', text: vi.day.missed },
  rejected: { glyph: '↩', ring: 'bg-surface text-danger border-danger', text: vi.day.rejected },
  future: { glyph: '', ring: 'bg-surface text-muted border-border', text: vi.day.future },
};

/** Dải 10 ngày. Mỗi trạng thái khác nhau bằng biểu tượng VÀ chữ (không chỉ màu). */
export function DayStrip({ days, today }: { days: DayState[]; today: number }) {
  return (
    <ol className="grid grid-cols-5 gap-y-3 gap-x-2" aria-label="Hành trình 10 ngày">
      {days.map((state, i) => {
        const l = LOOK[state];
        const isToday = i + 1 === today;
        return (
          <li key={i} className="flex flex-col items-center gap-1" aria-label={`Ngày ${i + 1}: ${l.text}`}>
            <span className={`flex h-11 w-11 items-center justify-center rounded-pill border-2 text-body font-bold shadow-soft ${l.ring} ${isToday ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}>
              {l.glyph || i + 1}
            </span>
            <span className={`text-caption ${isToday ? 'font-bold text-primary' : 'text-muted'}`}>N{i + 1}</span>
          </li>
        );
      })}
    </ol>
  );
}
