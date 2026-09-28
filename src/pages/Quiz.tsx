import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ChapterTease } from '../components/ChapterTease';
import { GameShell } from '../components/GameShell';
import { Gumi } from '../components/Gumi';
import { actOfDay } from '../lib/scoring';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';
import { playSfx } from '../lib/sfx';
import type { QuizQuestion, QuizResult } from '../api/types';

type Phase = 'intro' | 'playing' | 'result';
const DAY = 2;

/** S07 — Quiz Day 2 (thanh trượt): 1 câu "trà sữa có bao nhiêu thìa đường?". Trúng khoảng 12–15 = đúng.
 *  Điểm chấm ở server (mock/RPC); client chỉ gửi số đoán và hiển thị đúng/lệch + giải thích. */
export function Quiz() {
  const qs = useAsync(() => api.getQuizQuestions(), []);
  const [phase, setPhase] = useState<Phase>('intro');
  const [guess, setGuess] = useState(8);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);

  if (phase === 'result' && result) {
    const hit = guess >= vi.quiz.correctMin && guess <= vi.quiz.correctMax;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 pt-4 text-center">
        <Gumi state="bo_pho" size={150} event="cheer" eventKey={1} />
        <Banner kind={hit ? 'success' : 'info'}>{hit ? vi.quiz.correct : vi.quiz.off}</Banner>
        <Card className="text-left">
          <p className="text-small font-bold text-primary">{vi.quiz.answerWas}</p>
          <p className="mt-1 text-small text-muted">{vi.quiz.explain}</p>
        </Card>
        <Banner kind="success">{vi.quiz.result(result.score, result.max)}</Banner>
        <p className="text-small text-muted">{vi.quiz.resultSub}</p>
        <ChapterTease day={DAY} />
        <div className="flex w-full max-w-xs flex-col items-stretch gap-2 sm:max-w-md sm:flex-row">
          <Link to="/journey" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-control bg-primary px-5 font-semibold text-on-primary shadow-pop">{vi.minigames.common.backHome}</Link>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong/50 bg-surface px-5 font-semibold text-muted">{vi.minigames.common.backToRoom}</Link>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <GameShell act={actOfDay(DAY)} title={vi.quiz.title} intro={vi.quiz.intro}
        footer={<Button onClick={() => setPhase('playing')} block>{vi.quiz.start}</Button>}>
        <div className="flex flex-1 items-center justify-center">
          <Banner kind="info">{vi.quiz.note}</Banner>
        </div>
      </GameShell>
    );
  }

  return (
    <AsyncView state={qs}>
      {(questions: QuizQuestion[]) => {
        const q = questions[0]!;
        const submit = async () => {
          setBusy(true);
          try { setResult(await api.submitQuiz({ [q.id]: guess })); playSfx('win'); setPhase('result'); }
          finally { setBusy(false); }
        };
        return (
          <GameShell act={actOfDay(DAY)} title={vi.quiz.title}
            footer={<Button onClick={submit} loading={busy} block>{vi.quiz.submit}</Button>}>
            <div className="flex flex-1 flex-col justify-center">
              <Card className="flex flex-col gap-4">
                <p className="text-body font-semibold">{vi.quiz.question}</p>
                <div className="flex flex-col gap-2">
                  <label htmlFor="guess" className="text-small">{vi.quiz.guessLabel} <span className="font-bold text-primary">{vi.quiz.spoons(guess)}</span></label>
                  <input id="guess" type="range" min={q.min} max={q.max} value={guess} onChange={(e) => setGuess(Number(e.target.value))} className="h-11 w-full accent-primary" />
                  <div className="flex justify-between text-caption text-muted"><span>{q.min}</span><span>{q.max} thìa</span></div>
                </div>
              </Card>
            </div>
          </GameShell>
        );
      }}
    </AsyncView>
  );
}
