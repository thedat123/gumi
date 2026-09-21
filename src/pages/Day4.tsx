import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChapterTease } from '../components/ChapterTease';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';

const SUGAR: string[] = [...vi.day4.sugarNames];
const START = 30;
type Phase = 'intro' | 'playing' | 'timeout' | 'success';

/** S08 — Day 4: vạch mặt đường ẩn (30s). Hoàn thành thì gửi submit_minigame(4). */
export function Day4() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [found, setFound] = useState<string[]>([]);
  const [warn, setWarn] = useState(false);
  const [time, setTime] = useState(START);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (time <= 0) { setPhase('timeout'); return; }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, time]);

  const start = () => { setPhase('playing'); setFound([]); setWarn(false); setTime(START); };
  const tap = (name: string) => {
    if (phase !== 'playing') return;
    if (SUGAR.includes(name)) {
      setWarn(false);
      const next = found.includes(name) ? found : [...found, name];
      setFound(next);
      if (next.length === SUGAR.length) { setPhase('success'); api.submitMinigame(11).catch(() => {}); }
    } else {
      setWarn(true);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <h1 className="text-headline font-bold">{vi.day4.title}</h1>
        <p className="text-small text-muted">{vi.day4.intro}</p>
        <Button onClick={start} block>{vi.day4.start}</Button>
      </div>
    );
  }
  if (phase === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <Gumi state="bo_pho" size={150} event="cheer" eventKey={1} />
        <Banner kind="success">{vi.day4.success}</Banner>
        <p className="text-small text-muted">{vi.day4.crashInfo}</p>
        <ChapterTease day={11} />
        <Link to="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.day4.backHome}</Link>
      </div>
    );
  }
  if (phase === 'timeout') {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <h1 className="text-title font-bold">{vi.day4.title}</h1>
        <Banner kind="error">{vi.day4.timeout}</Banner>
        <Button onClick={start} block>{vi.day4.retry}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-title font-bold">{vi.day4.title}</h1>
        <span className="rounded-pill bg-accent px-3 py-1 text-small font-bold text-on-accent" aria-live="polite">{vi.day4.timeLeft(time)}</span>
      </div>
      <p className="text-small font-semibold">{vi.day4.found(found.length)}</p>
      {warn && <Banner kind="error">{vi.day4.wrong}</Banner>}
      <Card>
        <p className="mb-3 text-caption text-muted">{vi.day4.label}</p>
        <div className="flex flex-wrap gap-2">
          {vi.day4.ingredients.map((ing) => {
            const hit = found.includes(ing);
            return (
              <button key={ing} type="button" onClick={() => tap(ing)}
                className={`min-h-11 rounded-control border-2 px-3 font-semibold ${hit ? 'border-success bg-success text-on-primary' : 'border-border-strong bg-surface'}`}>
                {hit ? '✔ ' : ''}{ing}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
