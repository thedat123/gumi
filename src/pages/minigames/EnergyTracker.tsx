import { useState } from 'react';
import { api } from '../../api';
import { Button } from '../../components/Button';
import { GameShell } from '../../components/GameShell';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

const LEVELS = vi.minigames.tracker.levels;

/** Ngày 14 — Energy Tracker: chọn mức tỉnh táo (không có đáp án đúng/sai). */
export function EnergyTracker() {
  const day = 14;
  const m = vi.missions[day - 1]!;
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <MissionDone day={day} points={m.points} note={vi.minigames.tracker.success} />;

  const submit = async () => {
    setBusy(true);
    try { await api.submitMinigame(day); } catch { /* mock: bỏ qua */ }
    setDone(true);
  };

  return (
    <GameShell act={actOfDay(day)} title={vi.minigames.tracker.title} intro={vi.minigames.tracker.intro}
      footer={<Button onClick={submit} loading={busy} disabled={sel === null} block>{vi.minigames.tracker.submit}</Button>}>
      <div className="flex flex-1 flex-col justify-center gap-4">
        <p className="text-center text-body font-bold">{vi.minigames.tracker.prompt}</p>
        <div className="grid grid-cols-5 gap-2">
          {LEVELS.map((lv, i) => (
            <button key={lv.label} type="button" onClick={() => { setSel(i); playSfx('pop'); }} aria-pressed={sel === i}
              className={`game-tile flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-card border-2 p-2 text-center shadow-soft ${sel === i ? 'border-primary bg-primary/10 bump' : 'border-border bg-surface/95 backdrop-blur'}`}>
              <span aria-hidden="true" className="text-[34px] leading-none">{lv.emoji}</span>
              <span className="text-caption font-bold leading-tight">{lv.label}</span>
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
