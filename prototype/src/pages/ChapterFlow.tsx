import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DialogueLine } from '../components/Dialogue';
import { Gumi } from '../components/Gumi';
import { vi } from '../content/vi';
import { actOfDay, isBossDay, TOTAL_DAYS } from '../mock/scenarios';
import type { GumiEvent } from '../mock/ScenarioContext';

type Beat = 'intro' | 'mission' | 'outro';

// Nền vùng đất (viết đủ lớp để Tailwind quét được).
const REGION_TINT: Record<1 | 2 | 3, string> = { 1: 'bg-accent/10', 2: 'bg-success/10', 3: 'bg-info/10' };
const KIND_LABEL: Record<string, string> = { DRINK: '🥤 Uống', KNOW: '💡 Khám phá', SHARE: '📣 Lan toả', FINAL: '🎓 Tốt nghiệp', BOSS: '⚔️ Cửa ải' };

/** Một chương = 3 nhịp: MỞ (thoại) → NHIỆM VỤ (mô phỏng) → KẾT (phản ứng + hé lộ mai). */
export function ChapterFlow() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam);
  const [beat, setBeat] = useState<Beat>('intro');
  const [evt, setEvt] = useState<{ name: GumiEvent; key: number } | null>(null);

  const chapter = vi.story.chapters[day - 1];
  const m = vi.missions[day - 1];
  if (!chapter || !m || day < 1 || day > TOTAL_DAYS) {
    return (
      <div className="flex flex-col items-center gap-3 pt-10 text-center">
        <Banner kind="error">Không có chương này.</Banner>
        <Link to="/" className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.story.ui.backToMap}</Link>
      </div>
    );
  }

  const act = actOfDay(day);
  const boss = isBossDay(day);
  const isFinal = day === TOTAL_DAYS;
  const a = vi.story.acts[act - 1]!;

  const complete = () => {
    setEvt({ name: isFinal ? 'evolve' : 'cheer', key: Date.now() });
    setBeat('outro');
  };

  return (
    <div className={`-mx-4 -mt-2 flex min-h-[78dvh] flex-col gap-4 rounded-b-card px-4 pb-2 pt-2 ${REGION_TINT[act]}`}>
      {/* Đầu chương: số chương + vùng đất + lối thoát */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-caption font-bold text-primary">{vi.story.ui.chapterOf(day)}</p>
          <p className="text-caption text-muted">{a.icon} {a.name}</p>
        </div>
        <Link to="/" className="text-caption font-semibold text-muted underline underline-offset-4">✕ {vi.story.ui.backToMap}</Link>
      </div>

      {beat === 'intro' && (
        <div className="beat flex flex-1 flex-col gap-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <Gumi state="bo_pho" size={150} interactive progress={(day - 1) / TOTAL_DAYS} />
            <span className="rounded-pill bg-surface px-3 py-1 text-caption font-bold text-primary shadow-sm">{boss ? '⚔️ CỬA ẢI' : `Ngày ${day}`} · {m.title}</span>
          </div>
          <div className="flex flex-col gap-3">
            {chapter.intro.map((line, i) => <DialogueLine key={i} line={line} />)}
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Button onClick={() => setBeat('mission')} block>{vi.story.ui.startMission}</Button>
            <button onClick={() => setBeat('mission')} className="min-h-11 text-small font-semibold text-muted underline underline-offset-4">{vi.story.ui.skip}</button>
          </div>
        </div>
      )}

      {beat === 'mission' && (
        <div className="beat flex flex-1 flex-col gap-3">
          <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-small">
              <span className="rounded-pill bg-accent px-3 py-1 font-semibold text-on-accent">{KIND_LABEL[m.kind]}</span>
              <span className="font-semibold">{vi.story.ui.earned(m.points)}</span>
            </div>
            <h2 className="text-title font-bold">Ngày {day}: {m.title}</h2>
            <p className="text-small text-muted">{m.description}</p>
          </Card>
          <Banner kind="info">Bản thử: bấm nút dưới để mô phỏng hoàn thành nhiệm vụ và xem đoạn kết chương.</Banner>
          <div className="mt-auto flex flex-col gap-2">
            <Button onClick={complete} block>{vi.story.ui.doneMock}</Button>
            <button onClick={() => setBeat('intro')} className="min-h-11 text-small font-semibold text-muted underline underline-offset-4">◂ Xem lại phần mở</button>
          </div>
        </div>
      )}

      {beat === 'outro' && (
        <div className="beat flex flex-1 flex-col gap-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <Gumi state={isFinal ? 'tien_hoa' : 'bo_pho'} size={160} progress={day / TOTAL_DAYS} event={evt?.name ?? null} eventKey={evt?.key ?? 0} />
            <span className="rounded-pill bg-primary px-4 py-1 text-body font-bold text-on-primary shadow-sm">{vi.story.ui.earned(m.points)}</span>
          </div>
          <div className="flex flex-col gap-3">
            {chapter.win.map((line, i) => <DialogueLine key={i} line={line} />)}
          </div>
          <Card className="border-primary! bg-surface">
            <p className="text-caption font-bold text-muted">{isFinal ? '🎓 HOÀN THÀNH HÀNH TRÌNH' : `🔭 ${vi.story.ui.tomorrow}`}</p>
            <p className="text-small text-text">{chapter.tease}</p>
          </Card>
          <div className="mt-auto">
            <Link to="/" className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-5 font-semibold text-on-primary">{vi.story.ui.backToMap}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
