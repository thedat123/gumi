import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { vi } from '../content/vi';
import { playSfx } from '../lib/sfx';

export interface QuizQ { prompt: string; options: readonly string[]; answer: number; explain?: string }

/**
 * Engine trắc nghiệm / đuổi hình bắt chữ dùng chung: thanh tiến độ, phản hồi đúng–sai ngay,
 * tô sáng đáp án đúng, đếm số câu đúng, rồi báo hoàn thành.
 * `seconds` > 0 → BẬT đồng hồ đếm ngược MỖI CÂU: hết giờ tự khoá câu (tính là sai), lộ đáp án, KHÔNG cho chọn lại.
 */
export function QuizGame({ questions, promptClass = 'text-title', seconds = 0, onComplete }: {
  questions: readonly QuizQ[];
  promptClass?: string;
  seconds?: number;
  onComplete: (correct: number) => void;
}) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [nudge, setNudge] = useState(0);
  const [timeLeft, setTimeLeft] = useState(seconds);
  const answeredRef = useRef(false);
  const q = questions[step]!;
  const answered = picked !== null;
  const timedOut = picked === -1;
  const isRight = picked === q.answer;
  const last = step + 1 >= questions.length;

  // Đồng hồ đếm ngược mỗi câu (nếu bật). Hết giờ mà chưa chọn → khoá là "hết giờ" (không tính đúng).
  useEffect(() => {
    if (!seconds) return;
    answeredRef.current = false;
    setTimeLeft(seconds);
    const start = Date.now();
    const id = setInterval(() => {
      if (answeredRef.current) { clearInterval(id); return; }
      const left = seconds - Math.floor((Date.now() - start) / 1000);
      if (left <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        answeredRef.current = true;
        setPicked((p) => (p === null ? -1 : p));
        playSfx('wrong');
      } else {
        setTimeLeft(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [step, seconds]);

  const choose = (i: number) => {
    if (answered) return;
    answeredRef.current = true;
    setPicked(i);
    setNudge((n) => n + 1);
    if (i === q.answer) { setCorrect((c) => c + 1); playSfx('happy'); } else playSfx('wrong');
  };
  const next = () => {
    if (last) { onComplete(correct); return; }
    setStep(step + 1);
    setPicked(null);
  };

  const low = seconds > 0 && !answered && timeLeft <= 3;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="timer-track flex-1">
          <div className="timer-fill transition-all duration-300" style={{ width: `${((answered ? step + 1 : step) / questions.length) * 100}%` }} />
        </div>
        <span className="shrink-0 text-small font-bold text-muted">{step + 1}/{questions.length}</span>
        {seconds > 0 && (
          <span className={`flex shrink-0 items-center gap-1 rounded-pill px-2 py-0.5 text-small font-extrabold tabular-nums ${low ? 'animate-pulse bg-danger/15 text-danger' : 'bg-info/15 text-info'}`}>
            <Icon name="clock" size={14} /> {answered ? Math.max(0, timeLeft) : timeLeft}s
          </span>
        )}
        <span className="flex shrink-0 items-center gap-1 rounded-pill bg-success/15 px-2 py-0.5 text-small font-bold text-success"><Icon name="check" size={14} strokeWidth={2.4} /> {correct}</span>
      </div>

      <Card className="flex flex-col gap-4">
        <p className={`text-center font-bold leading-tight ${promptClass}`} aria-label="Đề bài">{q.prompt}</p>
        <div key={nudge} className={`grid gap-2 ${answered && !isRight ? 'shake' : ''}`}>
          {q.options.map((opt, i) => {
            const cls = !answered ? 'game-tile border-border-strong/50 bg-surface'
              : i === q.answer ? 'border-success bg-success/15 text-success bump'
              : i === picked ? 'border-danger bg-danger/15 text-danger'
              : 'border-border-strong/40 bg-surface opacity-55';
            return (
              <button key={opt} type="button" disabled={answered} onClick={() => choose(i)}
                className={`flex min-h-12 items-center justify-between gap-2 rounded-control border-2 px-4 py-2 text-left font-semibold shadow-soft transition-all ${cls}`}>
                <span>{opt}</span>
                {answered && i === q.answer && <Icon name="check" size={18} strokeWidth={2.4} />}
                {answered && i === picked && i !== q.answer && <Icon name="x" size={18} strokeWidth={2.4} />}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="flex flex-col gap-2 pop-in">
            <p className={`flex items-center justify-center gap-1.5 text-center text-small font-bold ${isRight ? 'text-success' : 'text-danger'}`}>
              <Icon name={isRight ? 'sparkle' : 'x'} size={16} filled={isRight} />
              {timedOut ? vi.minigames.common.timeUpQuiz : isRight ? 'Chính xác!' : 'Chưa đúng — đáp án đúng đang sáng màu xanh.'}
            </p>
            {q.explain && <p className="rounded-control bg-info/10 p-2 text-center text-caption text-info">{q.explain}</p>}
            <Button onClick={next} block>{last ? 'Hoàn thành' : 'Câu tiếp'}{!last && <Icon name="arrow-right" size={16} />}{last && <Icon name="sparkle" size={16} filled />}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
