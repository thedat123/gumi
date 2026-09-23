import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { Banner } from '../../components/Banner';
import { Confetti, GameShell, GameStat } from '../../components/GameShell';
import { Icon } from '../../components/Icon';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

interface MCard { id: number; pairId: number; text: string }

function build(pairs: readonly { a: string; b: string }[]): MCard[] {
  const cards: MCard[] = [];
  pairs.forEach((p, idx) => { cards.push({ id: idx * 2, pairId: idx, text: p.a }); cards.push({ id: idx * 2 + 1, pairId: idx, text: p.b }); });
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j]!, cards[i]!]; }
  return cards;
}

/** Ngày 12 & 18 — Lật thẻ trí nhớ THẬT: thẻ lật 3D, đếm lượt, ghép đủ cặp là thắng. */
export function MemoryMatch() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 12;
  const cfg = day === 18 ? vi.minigames.memory18 : vi.minigames.memory12;
  const m = vi.missions[day - 1];
  const [cards] = useState<MCard[]>(() => build(cfg.pairs));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState(0);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;
  if (done) return <MissionDone day={day} points={m.points} note={`Ghép xong trong ${moves} lượt lật! ${cfg.success}`} />;

  const flip = (i: number) => {
    if (busy || flipped.includes(i) || matched.includes(cards[i]!.pairId)) return;
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
        if (nm.length === cfg.pairs.length) { setBurst((n) => n + 1); api.submitMinigame(day).catch(() => {}); setTimeout(() => setDone(true), 1200); }
      }, 480);
    } else {
      setTimeout(() => { setFlipped([]); setBusy(false); }, 820);
    }
  };

  return (
    <GameShell act={actOfDay(day)} title={cfg.title} intro={cfg.intro}
      hud={<GameStat icon="sparkle" value={`${moves}`} tone="accent" />}
      footer={<p className="text-center text-caption font-semibold text-muted">Đã ghép {matched.length}/{cfg.pairs.length} cặp</p>}>
      <div className="grid flex-1 grid-cols-2 content-center gap-3">
        {cards.map((c, i) => {
          const isMatched = matched.includes(c.pairId);
          const up = isMatched || flipped.includes(i);
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
