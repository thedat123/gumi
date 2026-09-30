import { useState } from 'react';
import { api } from '../api';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GameShell, GameStat } from '../components/GameShell';
import { MissionDone } from '../components/MissionDone';
import { FeatureModal } from '../components/FeatureModal';
import { actOfDay } from '../lib/scoring';
import { vi } from '../content/vi';
import { playSfx } from '../lib/sfx';
import rebusTraThai from '../assets/games/rebus-tra-thai.png';
import rebusCamVat from '../assets/games/rebus-cam-vat.png';
import rebusSuaGao from '../assets/games/rebus-sua-gao.png';

// Ảnh đề đuổi-hình theo thứ tự card trong nội dung (Trà Thái · Cam Vắt · Sữa Gạo).
const IMAGES = [rebusTraThai, rebusCamVat, rebusSuaGao];

/** S09 — Ngày 3: Đuổi Hình Bắt Chữ. Ghép 2 hình → đoán tên đồ uống; đúng thì mở khoá sự thật về
 *  đường/calo của ly đó. Giải hết 3 hình rồi gửi submit_minigame(3). */
export function Day7() {
  const day = 3;
  const m = vi.missions[day - 1]!;
  const cards = vi.day3.cards;
  const options = cards.map((c) => c.name); // 3 tên món dùng làm đáp án chọn
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'guess' | 'reveal'>('guess');
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [showFact, setShowFact] = useState(false);

  if (done) return <MissionDone day={day} points={m.points} note={vi.day3.success} />;

  const card = cards[step]!;
  const last = step + 1 >= cards.length;

  const pick = (name: string) => {
    if (name === card.name) { playSfx('happy'); setPhase('reveal'); setShowFact(true); }
    else { playSfx('wrong'); setWrong((n) => n + 1); }
  };
  const next = () => {
    setShowFact(false);
    if (last) { playSfx('win'); api.submitMinigame(day).catch(() => {}); setDone(true); }
    else { setStep(step + 1); setPhase('guess'); setWrong(0); }
  };

  const good = card.tone === 'good';
  return (
    <GameShell act={actOfDay(day)} title={vi.day3.title} intro={vi.day3.intro}
      hud={<GameStat icon="check" value={vi.day3.puzzleOf(step + 1, cards.length)} tone="success" />}
      footer={phase === 'reveal' ? <Button onClick={next} block>{last ? vi.day3.finish : vi.day3.next}</Button> : undefined}>
      <div className="flex flex-1 flex-col gap-3">
        <div className="rounded-card border-2 border-border bg-white p-3 shadow-soft">
          <img src={IMAGES[step]} alt={phase === 'reveal' ? card.name : 'Đuổi hình bắt chữ'} className="mx-auto max-h-44 w-full object-contain" />
        </div>

        {phase === 'guess' ? (
          <>
            {wrong > 0 && <div key={wrong} className="shake"><Banner kind="error">{vi.day3.wrong}</Banner></div>}
            <p className="text-center text-small font-semibold">{vi.day3.guessPrompt}</p>
            <div className="flex flex-col gap-2">
              {options.map((name) => (
                <Button key={name} variant="secondary" block onClick={() => pick(name)}>{name}</Button>
              ))}
            </div>
          </>
        ) : (
          <Card className={`pop-in text-left ${good ? 'border-success! bg-success/8' : 'border-accent! bg-accent/8'}`}>
            <div className="flex items-center gap-2">
              <span className="text-[26px]" aria-hidden="true">{card.emoji}</span>
              <h3 className="text-title font-bold">{card.name}</h3>
              <span className={`ml-auto rounded-pill px-2 py-0.5 text-caption font-bold ${good ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'}`}>{card.tag}</span>
            </div>
            <p className="mt-1 text-caption font-bold text-success">{vi.day3.revealTitle}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {card.points.map((p) => (
                <li key={p.h}>
                  <p className="text-small font-bold">{p.h}</p>
                  <p className="text-small text-muted">{p.p}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      {showFact && <FeatureModal title={card.name} eyebrow={`Fact về đồ uống · Câu ${step + 1}/${cards.length}`} tone={good ? 'success' : 'info'} onClose={() => setShowFact(false)}
        action={<Button onClick={next} block variant="secondary">{last ? vi.day3.finish : vi.day3.next}</Button>}>
        <ul className="space-y-3">{card.points.map((point) => <li key={point.h}><strong className="block text-white">{point.h}</strong><span>{point.p}</span></li>)}</ul>
      </FeatureModal>}
    </GameShell>
  );
}
