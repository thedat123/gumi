import { useEffect, useMemo, useRef, useState } from 'react';
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
import rebusTraThai from '../assets/games/rebus-tra-thai.webp';
import rebusCamVat from '../assets/games/rebus-cam-vat.webp';
import rebusSuaGao from '../assets/games/rebus-sua-gao.webp';

// Ảnh đề đuổi-hình theo thứ tự card trong nội dung (Trà Thái · Cam Vắt · Sữa Gạo).
const IMAGES = [rebusTraThai, rebusCamVat, rebusSuaGao];

// Bỏ dấu + đưa về chữ HOA để so khớp (không bắt người chơi gõ dấu tiếng Việt).
const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toUpperCase().replace(/[^A-Z]/g, '');

/** S09 — Ngày 3: Đuổi Hình Bắt Chữ. Ghép 2 hình → GÕ tên đồ uống vào ô chữ (tự nhảy ô);
 *  đúng thì mở khoá sự thật về đường/calo của ly đó. Giải hết 3 hình rồi gửi submit_minigame(3). */
export function Day7() {
  const day = 3;
  const m = vi.missions[day - 1]!;
  const cards = vi.day3.cards;
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'guess' | 'reveal'>('guess');
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [showFact, setShowFact] = useState(false);
  const [entries, setEntries] = useState<Record<number, string>>({});
  const inputs = useRef<Record<number, HTMLInputElement | null>>({});

  const card = cards[step]!;
  const last = step + 1 >= cards.length;

  // Tách tên món thành ký tự: ô nhập cho chữ cái, khoảng trống giữa các từ hiển thị là khe hở.
  const chars = useMemo(() => Array.from(card.name), [card.name]);
  const letterIdxs = useMemo(() => chars.map((c, i) => (/\p{L}/u.test(c) ? i : -1)).filter((i) => i >= 0), [chars]);
  const target = useMemo(() => strip(card.name), [card.name]);
  const guessStr = letterIdxs.map((i) => entries[i] ?? '').join('');
  const allFilled = letterIdxs.every((i) => entries[i]);

  // Tự kiểm tra khi điền kín ô: đúng → mở fact; sai → báo lỗi, cho sửa.
  useEffect(() => {
    if (phase !== 'guess' || !allFilled) return;
    if (strip(guessStr) === target) { playSfx('happy'); setPhase('reveal'); setShowFact(true); }
    else { playSfx('wrong'); setWrong((n) => n + 1); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, phase]);

  if (done) return <MissionDone day={day} points={m.points} note={vi.day3.success} />;

  const focusAt = (i: number) => { const el = inputs.current[i]; if (el) { el.focus(); el.select(); } };
  const nextLetter = (i: number) => letterIdxs[letterIdxs.indexOf(i) + 1];
  const prevLetter = (i: number) => letterIdxs[letterIdxs.indexOf(i) - 1];

  const type = (i: number, raw: string) => {
    const ch = raw.slice(-1).toUpperCase();
    if (ch && !/\p{L}/u.test(ch)) return;
    setEntries((p) => {
      const n = { ...p };
      if (ch) n[i] = ch; else delete n[i];
      return n;
    });
    if (ch) { const nx = nextLetter(i); if (nx != null) focusAt(nx); }
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Backspace' && !(entries[i] ?? '')) {
      const pv = prevLetter(i);
      if (pv != null) { e.preventDefault(); setEntries((p) => { const n = { ...p }; delete n[pv]; return n; }); focusAt(pv); }
    }
  };

  const next = () => {
    setShowFact(false);
    if (last) { playSfx('win'); api.submitMinigame(day).catch(() => {}); setDone(true); }
    else { setStep(step + 1); setPhase('guess'); setWrong(0); setEntries({}); }
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
            <div className="flex flex-wrap items-center justify-center gap-1">
              {letterIdxs.map((i, n) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  value={entries[i] ?? ''}
                  onChange={(e) => type(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  onFocus={(e) => e.currentTarget.select()}
                  inputMode="text" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                  aria-label={`Ô chữ ${n + 1}`}
                  className="h-11 w-9 rounded-control border-2 border-accent/60 bg-surface text-center text-title font-extrabold uppercase text-text caret-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              ))}
            </div>
            <p className="text-center text-caption text-muted">{vi.day3.typeHint}</p>
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
