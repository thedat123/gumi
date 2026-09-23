import { useState } from 'react';
import { api } from '../../api';
import { Banner } from '../../components/Banner';
import { Confetti, GameShell, GameStat } from '../../components/GameShell';
import { Icon } from '../../components/Icon';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

const WORDS: string[] = [...vi.minigames.wordHunt.words];
const SUGARS: string[] = [...vi.minigames.wordHunt.sugars];

/** Ngày 9 — Truy Tìm Mật Khẩu: chạm đúng 5 tên đường ẩn giữa đám chữ. */
export function WordHunt() {
  const day = 9;
  const m = vi.missions[day - 1]!;
  const [found, setFound] = useState<string[]>([]);
  const [warn, setWarn] = useState(0);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);

  if (done) return <MissionDone day={day} points={m.points} note={vi.minigames.wordHunt.success} />;

  const tap = (w: string) => {
    if (found.includes(w)) return;
    if (!SUGARS.includes(w)) { playSfx('wrong'); setWarn((n) => n + 1); return; }
    const next = [...found, w];
    setFound(next);
    playSfx('pop');
    if (next.length === SUGARS.length) { playSfx('happy'); setBurst((n) => n + 1); api.submitMinigame(day).catch(() => {}); setTimeout(() => setDone(true), 1100); }
  };

  return (
    <GameShell act={actOfDay(day)} title={vi.minigames.wordHunt.title} intro={vi.minigames.wordHunt.intro}
      hud={<GameStat icon="check" value={vi.minigames.wordHunt.found(found.length, SUGARS.length)} tone="success" />}
      footer={<Banner kind="info">{vi.minigames.wordHunt.note}</Banner>}>
      {warn > 0 && <div key={warn} className="mb-2 shake"><Banner kind="error">{vi.minigames.wordHunt.wrong}</Banner></div>}
      <div className="grid flex-1 grid-cols-2 content-start gap-2.5 sm:grid-cols-3">
        {WORDS.map((w) => {
          const hit = found.includes(w);
          return (
            <button key={w} type="button" onClick={() => tap(w)} disabled={hit}
              className={`game-tile flex min-h-14 items-center justify-center gap-1.5 rounded-card border-2 px-3 text-center text-small font-bold shadow-soft transition-colors ${hit ? 'border-success bg-success text-on-primary bump' : 'border-border bg-surface/95 backdrop-blur'}`}>
              {hit && <Icon name="check" size={16} strokeWidth={2.4} />}{w}
            </button>
          );
        })}
      </div>
      <Confetti fire={burst} />
    </GameShell>
  );
}
