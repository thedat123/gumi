import { Link } from 'react-router-dom';
import { vi } from '../content/vi';
import { Card } from './Card';

const KIND: Record<string, { label: string; chip: string }> = {
  DRINK: { label: '🥤 Uống', chip: 'bg-accent text-on-accent' },
  KNOW: { label: '💡 Khám phá', chip: 'bg-info text-on-primary' },
  SHARE: { label: '📣 Lan toả', chip: 'bg-pink text-on-pink' },
  FINAL: { label: '🎓 Tốt nghiệp', chip: 'bg-primary text-on-primary' },
};

export function MissionCard({ day, done = false }: { day: number; done?: boolean }) {
  const m = vi.missions[day - 1];
  if (!m) return null;
  const k = KIND[m.kind] ?? KIND.DRINK!;
  return (
    <Card className="flex flex-col gap-2 border-l-4 border-l-primary!">
      <div className="flex items-center justify-between text-small">
        <span className={`rounded-pill px-3 py-1 font-semibold ${k.chip}`}>{k.label}</span>
        <span className="rounded-pill bg-accent/20 px-3 py-1 font-bold text-primary">+{m.points} điểm</span>
      </div>
      <h3 className="text-title font-bold">Ngày {m.day}: {m.title}</h3>
      <p className="text-small text-muted">{m.description}</p>
      {done ? (
        <p className="rounded-control bg-success/10 py-2 text-center text-small font-semibold text-success">✔ {vi.day.done}</p>
      ) : (
        <Link to={`/mission/${m.day}`} className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 text-body font-semibold text-on-primary shadow-pop transition-transform active:scale-95">Bắt đầu →</Link>
      )}
    </Card>
  );
}
