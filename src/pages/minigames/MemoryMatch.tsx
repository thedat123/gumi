import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { Banner } from '../../components/Banner';
import { Confetti, GameShell, GameStat } from '../../components/GameShell';
import { Gumi } from '../../components/Gumi';
import { Icon } from '../../components/Icon';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

const TIME_LIMIT = 60;   // 1 phút tính giờ (sau khi xem trước)
const PREVIEW_MS = 3000; // lật mở toàn bộ ~3 giây để ghi nhớ, rồi úp lại mới chạy giờ

interface MCard { id: number; pairId: number; text: string }

function build(pairs: readonly { a: string; b: string }[]): MCard[] {
  const cards: MCard[] = [];
  pairs.forEach((p, idx) => { cards.push({ id: idx * 2, pairId: idx, text: p.a }); cards.push({ id: idx * 2 + 1, pairId: idx, text: p.b }); });
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j]!, cards[i]!]; }
  return cards;
}

/** Ngày 12 — Lật thẻ trí nhớ THẬT: thẻ lật 3D, đếm lượt, ghép đủ cặp là thắng. */
export function MemoryMatch() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 12;
  const cfg = vi.minigames.memory12;
  const m = vi.missions[day - 1];
  const [cards] = useState<MCard[]>(() => build(cfg.pairs));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState(0);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(true); // mở hết thẻ cho ghi nhớ trước khi tính giờ

  // Mở toàn bộ thẻ ~3 giây rồi úp lại, sau đó đồng hồ 1 phút mới bắt đầu.
  useEffect(() => { const t = setTimeout(() => setPreview(false), PREVIEW_MS); return () => clearTimeout(t); }, []);

  // Đồng hồ đếm ngược 1 phút (chỉ chạy sau khi hết xem trước). Hết giờ chưa đủ cặp → THUA, không chơi lại.
  useEffect(() => {
    if (preview || done || failed || matched.length >= cfg.pairs.length) return;
    if (timeLeft <= 0) {
      setFailed(true);
      playSfx('wrong');
      api.submitMinigame(day, matched.length * 10).catch(() => {});
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, preview, done, failed, day, matched.length, cfg.pairs.length]);

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;
  if (done) return <MissionDone day={day} points={m.points} note={`Ghép xong trong ${moves} lượt lật! ${cfg.success}`} />;
  if (failed) return (
    <div className="flex flex-col items-center gap-3 pt-6 text-center">
      <Gumi state="hap_hoi" size={140} />
      <Banner kind="error">{vi.minigames.common.timeUp}</Banner>
      <p className="max-w-xs text-small text-muted">{vi.minigames.common.timeUpMemory(matched.length, cfg.pairs.length)}</p>
      <p className="rounded-pill bg-accent/15 px-4 py-2 text-small font-extrabold text-primary">+{matched.length * 10} điểm · {matched.length} cặp đúng</p>
      <Link to="/journey" className="mt-1 inline-flex min-h-11 items-center justify-center rounded-[16px] border border-black/10 grad-brand px-6 font-semibold text-on-primary shadow-pop">{vi.minigames.common.backHome}</Link>
    </div>
  );

  const flip = (i: number) => {
    if (preview || busy || failed || flipped.includes(i) || matched.includes(cards[i]!.pairId)) return;
    playSfx('pop');
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length < 2) return;
    setBusy(true);
    setMoves((n) => n + 1);
    const [a, b] = next as [number, number];
    if (cards[a]!.pairId === cards[b]!.pairId) {
      const nm = [...matched, cards[a]!.pairId];
      setTimeout(() => {
        playSfx('happy');
        setMatched(nm);
        setFlipped([]);
        setBusy(false);
        if (nm.length === cfg.pairs.length) { setBurst((n) => n + 1); api.submitMinigame(day, m.points).catch(() => {}); setTimeout(() => setDone(true), 1200); }
      }, 480);
    } else {
      setTimeout(() => { setFlipped([]); setBusy(false); }, 820);
    }
  };

  return (
    <GameShell act={actOfDay(day)} title={cfg.title} intro={cfg.intro}
      hud={<><GameStat icon="clock" value={preview ? 'Xem' : `${timeLeft}s`} tone={!preview && timeLeft <= 5 ? 'accent' : 'info'} /><GameStat icon="sparkle" value={`${moves}`} tone="accent" /></>}
      footer={<p className={`text-center text-caption font-semibold ${preview ? 'text-primary' : 'text-muted'}`}>{preview ? cfg.previewHint : `Đã ghép ${matched.length}/${cfg.pairs.length} cặp`}</p>}>
      <div className="grid flex-1 grid-cols-4 content-center gap-2 sm:grid-cols-6 sm:gap-3">
        {cards.map((c, i) => {
          const isMatched = matched.includes(c.pairId);
          const up = preview || isMatched || flipped.includes(i);
          return (
            <button key={c.id} type="button" onClick={() => flip(i)} aria-label={up ? c.text : 'Thẻ úp — chạm để lật'}
              className={`card3d aspect-[5/4] transition-transform active:scale-95 ${up ? 'flipped' : ''}`}>
              <span className="card3d-inner">
                <span className="card3d-face grad-brand border-2 border-white/50 text-on-primary"><Icon name="paw" size={30} className="text-white/90" /></span>
                <span className={`card3d-face card3d-front border-2 p-2 text-center text-small font-bold leading-tight shadow-soft ${isMatched ? 'border-success bg-success/15 text-success card-pop' : 'border-primary/50 bg-surface text-text'}`}>{c.text}</span>
              </span>
            </button>
          );
        })}
      </div>
      <Confetti fire={burst} />
    </GameShell>
  );
}
