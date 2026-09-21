import { vi, type Line } from '../content/vi';

const FACE: Record<Line['who'], string> = { gumi: '🐱', boss: '🧋', narrator: '' };

/** Một dòng thoại trong chương. Gumi bên trái, Boss Đường bên phải, người kể ở giữa. */
export function DialogueLine({ line }: { line: Line }) {
  if (line.who === 'narrator') {
    return <p className="line-in px-2 text-center text-small italic text-muted">{line.text}</p>;
  }
  const isBoss = line.who === 'boss';
  const name = vi.story.ui.speaker[line.who];
  return (
    <div className={`line-in flex items-end gap-2 ${isBoss ? 'flex-row-reverse' : ''}`}>
      <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-title ${isBoss ? 'bg-danger/15' : 'bg-accent/25'}`}>{FACE[line.who]}</span>
      <div className={`max-w-[80%] rounded-card border-2 p-3 ${isBoss ? 'border-danger/40 bg-danger/10' : 'border-accent/50 bg-surface'}`}>
        <p className={`text-caption font-bold ${isBoss ? 'text-danger' : 'text-primary'}`}>{name}</p>
        <p className="text-small text-text">{line.text}</p>
      </div>
    </div>
  );
}
