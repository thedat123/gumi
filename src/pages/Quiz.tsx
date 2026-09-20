import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AsyncView } from '../components/AsyncView';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';
import { useAsync } from '../app/useAsync';
import type { QuizQuestion, QuizResult } from '../api/types';

type Phase = 'intro' | 'playing' | 'result';

/** S07 — Quiz Day 2 (thanh trượt). Điểm chấm ở server (mock/RPC), client chỉ gửi số đoán. */
export function Quiz() {
  const qs = useAsync(() => api.getQuizQuestions(), []);
  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [guesses, setGuesses] = useState<Record<number, number>>({});
  const [guess, setGuess] = useState(6);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);

  if (phase === 'result' && result) {
    return (
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <Gumi state="bo_pho" size={150} event="cheer" eventKey={1} />
        <Banner kind="success">{vi.quiz.result(result.score, result.max)}</Banner>
        <p className="text-small text-muted">{vi.quiz.resultSub}</p>
        <Link to="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.quiz.backHome}</Link>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <h1 className="text-headline font-bold">{vi.quiz.title}</h1>
        <p className="text-small text-muted">{vi.quiz.intro}</p>
        <Banner kind="info">{vi.quiz.note}</Banner>
        <Button onClick={() => setPhase('playing')} block>{vi.quiz.start}</Button>
      </div>
    );
  }

  return (
    <AsyncView state={qs}>
      {(questions: QuizQuestion[]) => {
        const q = questions[step]!;
        const submitAll = async (all: Record<number, number>) => {
          setBusy(true);
          try {
            const r = await api.submitQuiz(all);
            setResult(r);
            setPhase('result');
          } finally {
            setBusy(false);
          }
        };
        const next = () => {
          const all = { ...guesses, [q.id]: guess };
          setGuesses(all);
          if (step + 1 >= questions.length) submitAll(all);
          else { setStep(step + 1); setGuess(6); }
        };
        return (
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center justify-between">
              <h1 className="text-title font-bold">{vi.quiz.title}</h1>
              <span className="text-small font-semibold text-muted">{vi.quiz.questionOf(step + 1, questions.length)}</span>
            </div>
            <Card className="flex flex-col gap-4">
              <p className="text-body font-semibold">{q.drink}</p>
              <div className="flex flex-col gap-2">
                <label htmlFor="guess" className="text-small">{vi.quiz.guessLabel} <span className="font-bold">{vi.quiz.spoons(guess)}</span></label>
                <input id="guess" type="range" min={q.min} max={q.max} value={guess} onChange={(e) => setGuess(Number(e.target.value))} className="h-11 w-full accent-primary" />
                <div className="flex justify-between text-caption text-muted"><span>{q.min}</span><span>{q.max} thìa</span></div>
              </div>
              <Button onClick={next} loading={busy} block>{step + 1 >= questions.length ? vi.quiz.finish : vi.quiz.next}</Button>
            </Card>
          </div>
        );
      }}
    </AsyncView>
  );
}
