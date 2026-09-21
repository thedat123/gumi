import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Card } from '../components/Card';
import { ChapterTease } from '../components/ChapterTease';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';

const PUZZLES = vi.day7.puzzles;

/** S09 — Day 7: Emoji Catch + infographic Sugar Crash. Giải hết thì gửi submit_minigame(7). */
export function Day7() {
  const [step, setStep] = useState(0);
  const [warn, setWarn] = useState(false);
  const solved = step >= PUZZLES.length;

  const choose = (i: number) => {
    const p = PUZZLES[step]!;
    if (i === p.answer) {
      setWarn(false);
      const next = step + 1;
      setStep(next);
      if (next >= PUZZLES.length) api.submitMinigame(3).catch(() => {});
    } else {
      setWarn(true);
    }
  };

  if (solved) {
    return (
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <Gumi state="bo_pho" size={140} event="cheer" eventKey={1} />
        <Banner kind="success">{vi.day7.success}</Banner>
        <Card className="text-left">
          <h2 className="text-title font-bold">{vi.day7.infographicTitle}</h2>
          <p className="mt-1 text-small text-muted">{vi.day7.infographic}</p>
        </Card>
        <ChapterTease day={3} />
        <Link to="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.day7.backHome}</Link>
      </div>
    );
  }

  const p = PUZZLES[step]!;
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-title font-bold">{vi.day7.title}</h1>
        <span className="text-small font-semibold text-muted">{vi.day7.puzzleOf(step + 1, PUZZLES.length)}</span>
      </div>
      <p className="text-small text-muted">{vi.day7.intro}</p>
      {warn && <Banner kind="error">{vi.day7.wrong}</Banner>}
      <Card className="flex flex-col items-center gap-4">
        <p className="text-headline" aria-label="Chuỗi emoji">{p.emoji}</p>
        <div className="grid w-full gap-2">
          {p.options.map((opt, i) => (
            <button key={opt} type="button" onClick={() => choose(i)}
              className="min-h-11 rounded-control border-2 border-border-strong bg-surface px-4 font-semibold">
              {opt}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
