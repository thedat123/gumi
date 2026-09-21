import { Link } from 'react-router-dom';
import { vi } from '../content/vi';
import { Card } from './Card';

const KIND: Record<string, string> = { DRINK: '🥤 Uống', KNOW: '💡 Khám phá', SHARE: '📣 Lan toả', FINAL: '🎓 Tốt nghiệp', BOSS: '⚔️ Cửa ải' };

export function MissionCard({ day, done = false }: { day: number; done?: boolean }) {
  const m = vi.missions[day - 1];
  if (!m) return null;
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-small">
        <span className="rounded-pill bg-accent px-3 py-1 font-semibold text-on-accent">{KIND[m.kind]}</span>
        <span className="font-semibold">+{m.points} điểm</span>
      </div>
      <h3 className="text-title font-bold">Ngày {m.day}: {m.title}</h3>
      <p className="text-small text-muted">{m.description}</p>
      {done ? (
        <p className="text-small font-semibold text-success">✔ {vi.day.done}</p>
      ) : (
        <Link to={`/chapter/${m.day}`} className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 text-body font-semibold text-on-primary">Bắt đầu</Link>
      )}
    </Card>
  );
}
