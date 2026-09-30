import { useEffect, useState } from 'react';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Confetti, GameShell, GameStat } from '../components/GameShell';
import { CompletionPanel } from '../components/CompletionPanel';
import { Icon } from '../components/Icon';
import { actOfDay } from '../lib/scoring';
import { vi } from '../content/vi';
import { playSfx } from '../lib/sfx';

const SUGAR: string[] = [...vi.day4.sugarNames];
const START = 30;
const DAY = 11;
type Phase = 'intro' | 'playing' | 'timeout' | 'success';

/** S08 — Day 11: vạch mặt đường ẩn (30s). Hoàn thành thì gửi submit_minigame(11). */
export function Day4() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [found, setFound] = useState<string[]>([]);
  const [warn, setWarn] = useState(0);
  const [burst, setBurst] = useState(0);
  const [time, setTime] = useState(START);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (time <= 0) { setPhase('timeout'); return; }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, time]);

  const start = () => { setPhase('playing'); setFound([]); setWarn(0); setTime(START); };
  const tap = (name: string) => {
    if (phase !== 'playing' || found.includes(name)) return;
    if (SUGAR.includes(name)) {
      setWarn(0); playSfx('pop');
      const next = [...found, name];
      setFound(next);
      if (next.length === SUGAR.length) { playSfx('happy'); setBurst((n) => n + 1); api.submitMinigame(DAY).catch(() => {}); setTimeout(() => setPhase('success'), 900); }
    } else { playSfx('wrong'); setWarn((n) => n + 1); }
  };

  if (phase === 'success') {
    return <CompletionPanel day={DAY} points={vi.missions[DAY - 1]!.points} note={vi.day4.success}>
      <p className="text-small text-muted">{vi.day4.crashInfo}</p>
    </CompletionPanel>;
  }

  if (phase === 'intro') {
    return (
      <GameShell act={actOfDay(DAY)} title={vi.day4.title} intro={vi.day4.intro}
        footer={<Button onClick={start} block>{vi.day4.start}</Button>}>
        <div className="flex flex-1 items-center justify-center text-center">
          <p className="text-body font-semibold text-muted">{vi.day4.intro}</p>
        </div>
      </GameShell>
    );
  }

  if (phase === 'timeout') {
    return (
      <GameShell act={actOfDay(DAY)} title={vi.day4.title}
        footer={<Button onClick={start} block>{vi.day4.retry}</Button>}>
        <div className="flex flex-1 items-center justify-center"><Banner kind="error">{vi.day4.timeout}</Banner></div>
      </GameShell>
    );
  }

  return (
    <GameShell act={actOfDay(DAY)} title={vi.day4.title}
      hud={<GameStat icon="clock" value={`${time}s`} tone={time <= 8 ? 'primary' : 'info'} />}
      footer={<p className="text-center text-caption font-semibold text-muted">{vi.day4.found(found.length)}</p>}>
      {warn > 0 && <div key={warn} className="mb-2 shake"><Banner kind="error">{vi.day4.wrong}</Banner></div>}
      <div className="flex flex-1 flex-col justify-center">
        <p className="mb-2 text-center text-small font-semibold">{vi.day4.label}</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {vi.day4.ingredients.map((ing) => {
            const hit = found.includes(ing);
            return (
              <button key={ing} type="button" onClick={() => tap(ing)}
                className={`game-tile inline-flex min-h-12 items-center gap-1.5 rounded-card border-2 px-3.5 font-bold shadow-soft transition-colors ${hit ? 'border-success bg-success text-on-primary bump' : 'border-border bg-surface/95 backdrop-blur'}`}>
                {hit && <Icon name="check" size={15} strokeWidth={2.4} />}{ing}
              </button>
            );
          })}
        </div>
      </div>
      <Confetti fire={burst} />
    </GameShell>
  );
}
