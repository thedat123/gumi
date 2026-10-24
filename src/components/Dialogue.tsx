import { memo } from 'react';
import { vi, type Line } from '../content/vi';
import { Gumi } from './Gumi';

const FACE: Record<Line['who'], string> = { gumi: '🐱', boss: '🧋', narrator: '' };

/** Một dòng thoại trong chương. Gumi bên trái, Boss Đường bên phải, người kể ở giữa. */
export const DialogueLine = memo(function DialogueLine({ line }: { line: Line }) {
  if (line.who === 'narrator') {
    return <p className="line-in mx-auto max-w-[90%] rounded-pill bg-surface/80 px-4 py-1.5 text-center text-small italic text-muted shadow-soft backdrop-blur">{line.text}</p>;
  }
  const isBoss = line.who === 'boss';
  const name = vi.story.ui.speaker[line.who];
  return (
    <div className={`line-in flex items-end gap-2 ${isBoss ? 'flex-row-reverse' : ''}`}>
      {isBoss ? (
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-danger/15 text-title">{FACE.boss}</span>
      ) : (
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-accent/25"><Gumi state="bo_pho" size={34} faceOnly /></span>
      )}
      <div className={`max-w-[80%] rounded-card border-2 p-3 ${isBoss ? 'border-danger/40 bg-danger/10' : 'border-accent/50 bg-surface'}`}>
        <p className={`text-caption font-bold ${isBoss ? 'text-danger' : 'text-primary'}`}>{name}</p>
        <p className="text-small text-text">{line.text}</p>
      </div>
    </div>
  );
});
