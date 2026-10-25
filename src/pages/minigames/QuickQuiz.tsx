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

/** Trắc Nghiệm Chớp Nhoáng — Ngày 8. */
export function QuickQuiz() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) as QuizDay;
  const cfg = BY_DAY[day];
  const m = vi.missions[day - 1];
  const [note, setNote] = useState<string | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  if (!cfg || !m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;
  if (note !== null) return <MissionDone day={day} points={earned ?? m.points} earnedPoints={earned ?? undefined} note={note} />;

  return (
    <GameShell act={actOfDay(day)} title={cfg.title} intro={vi.minigames.quiz.intro}>
      <div className="flex flex-1 flex-col justify-center">
        {saveError && <Banner kind="error">Chưa lưu được kết quả. Bấm Hoàn thành để thử lại.</Banner>}
        {saving && <Banner kind="info">Đang lưu kết quả…</Banner>}
        <QuizGame
          questions={cfg.questions}
          promptClass="text-title"
          seconds={10}
          onComplete={(correct) => {
            if (saving) return;
            const pts = correct * 10; // brief: +10/câu đúng
            setEarned(pts);
            setSaving(true); setSaveError(false);
            void api.submitMinigame(day, pts)
              .then(() => setNote(`Bạn trả lời đúng ${correct}/${cfg.questions.length} câu. ${cfg.note}`))
              .catch(() => setSaveError(true))
              .finally(() => setSaving(false));
          }}
        />
      </div>
    </GameShell>
  );
}
