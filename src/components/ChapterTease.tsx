import { vi } from '../content/vi';
import { Card } from './Card';

/** Nhịp KẾT chương: hé lộ ngày mai (hoặc kết thúc hành trình ở Day 21). */
export function ChapterTease({ day }: { day: number }) {
  const c = vi.story.chapters[day - 1];
  if (!c) return null;
  const final = day >= vi.journey.total;
  return (
    <Card className="w-full border-primary! bg-surface text-left">
      <p className="text-caption font-bold text-muted">{final ? '🎓 HOÀN THÀNH HÀNH TRÌNH' : `🔭 ${vi.story.ui.tomorrow}`}</p>
      <p className="text-small text-text">{c.tease}</p>
    </Card>
  );
}
