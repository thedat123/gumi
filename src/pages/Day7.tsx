import { useState } from 'react';
import { api } from '../api';
import { Card } from '../components/Card';
import { GameShell } from '../components/GameShell';
import { MissionDone } from '../components/MissionDone';
import { QuizGame } from '../components/QuizGame';
import { actOfDay } from '../lib/scoring';
import { vi } from '../content/vi';

/** S09 — Ngày 3: Đuổi Hình Bắt Chữ (đề emoji). Giải hết + xem infographic Sugar Crash rồi gửi submit_minigame(3). */
export function Day7() {
  const day = 3;
  const m = vi.missions[day - 1]!;
  const [done, setDone] = useState(false);

  const questions = vi.day7.puzzles.map((p) => ({ prompt: p.emoji, options: p.options, answer: p.answer, explain: p.explain }));

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 pt-2">
        <Card className="border-info! bg-info/8 text-left">
          <h2 className="text-title font-bold">{vi.day7.infographicTitle}</h2>
          <p className="mt-1 text-small text-muted">{vi.day7.infographic}</p>
        </Card>
        <MissionDone day={day} points={m.points} />
      </div>
    );
  }

  return (
    <GameShell act={actOfDay(day)} title={vi.day7.title} intro={vi.day7.intro}>
      <div className="flex flex-1 flex-col justify-center">
        <QuizGame
          questions={questions}
          promptClass="text-[44px]"
          onComplete={() => { api.submitMinigame(day).catch(() => {}); setDone(true); }}
        />
      </div>
    </GameShell>
  );
}
