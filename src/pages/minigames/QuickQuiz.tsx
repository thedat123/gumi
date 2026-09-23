import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { Banner } from '../../components/Banner';
import { GameShell } from '../../components/GameShell';
import { MissionDone } from '../../components/MissionDone';
import { QuizGame } from '../../components/QuizGame';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';

const BY_DAY = vi.minigames.quiz.days;
type QuizDay = keyof typeof BY_DAY;

/** Trắc nghiệm / đuổi hình bắt chữ dùng chung cho Ngày 7 / 16 / 17. */
export function QuickQuiz() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) as QuizDay;
  const cfg = BY_DAY[day];
  const m = vi.missions[day - 1];
  const [note, setNote] = useState<string | null>(null);

  if (!cfg || !m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;
  if (note !== null) return <MissionDone day={day} points={m.points} note={note} />;

  const isRebus = day === 16; // đuổi hình bắt chữ → đề emoji cỡ lớn
  return (
    <GameShell act={actOfDay(day)} title={cfg.title} intro={vi.minigames.quiz.intro}>
      <div className="flex flex-1 flex-col justify-center">
        <QuizGame
          questions={cfg.questions}
          promptClass={isRebus ? 'text-[44px]' : 'text-title'}
          onComplete={(correct) => {
            api.submitMinigame(day).catch(() => {});
            setNote(`Bạn trả lời đúng ${correct}/${cfg.questions.length} câu. ${cfg.note}`);
          }}
        />
      </div>
    </GameShell>
  );
}
