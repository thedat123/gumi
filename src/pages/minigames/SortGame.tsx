import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Banner } from '../../components/Banner';
import { Button } from '../../components/Button';
import { Confetti, GameShell, GameStat } from '../../components/GameShell';
import { Gumi } from '../../components/Gumi';
import { Icon } from '../../components/Icon';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

const CORRECT: string[] = [...vi.minigames.sort.order];
const MAX_TRIES = 2; // brief: được 2 lượt xếp; sai quá 2 lần Kiểm tra → thua, tiêu ngày (không chơi lại).

function shuffled(): string[] {
  let r = [...CORRECT];
  do {
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j]!, r[i]!]; }
  } while (r.every((x, i) => x === CORRECT[i]));
  return r;
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const a = [...arr];
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x!);
  return a;
}

/** Ngày 6 — Đấu Trường Calo: KÉO-THẢ 5 ly xếp theo độ ngọt (ít → nhiều đường). */
export function SortGame() {
  const day = 6;
  const [order, setOrder] = useState<string[]>(shuffled);
  const [warn, setWarn] = useState(false);
  const [shake, setShake] = useState(0);
  const [won, setWon] = useState(false);
  const [done, setDone] = useState(false);
  const [tries, setTries] = useState(0);
  const [failed, setFailed] = useState(false);
  const [earned, setEarned] = useState(20);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const meta = useRef<{ rowH: number; listTop: number; grab: number }>({ rowH: 0, listTop: 0, grab: 0 });

  if (done) return <MissionDone day={day} points={earned} note={vi.minigames.sort.success} />;
  if (failed) return (
    <div className="flex flex-col items-center gap-3 pt-6 text-center">
      <Gumi state="hap_hoi" size={140} />
      <Banner kind="error">{vi.minigames.sort.outOfTries}</Banner>
      <p className="max-w-xs text-small text-muted">{vi.minigames.sort.outOfTriesSub}</p>
      <Link to="/journey" className="mt-1 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-6 font-semibold text-on-primary shadow-pop">{vi.minigames.common.backHome}</Link>
    </div>
  );

  const onDown = (e: RPointerEvent<HTMLDivElement>, i: number) => {
    if (won) return;
    const rows = listRef.current?.children;
    if (!rows || rows.length < 2) return;
    const r0 = rows[0]!.getBoundingClientRect();
    const r1 = rows[1]!.getBoundingClientRect();
    const ri = rows[i]!.getBoundingClientRect();
    meta.current = { rowH: r1.top - r0.top, listTop: r0.top, grab: e.clientY - ri.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragIndex(i);
    setDragY(0);
    setWarn(false);
    playSfx('pop');
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (dragIndex === null) return;
    const { rowH, listTop, grab } = meta.current;
    if (!rowH) return;
    const rowTop = e.clientY - grab; // vị trí đỉnh thẻ đang kéo
    let target = Math.round((rowTop - listTop) / rowH);
    target = Math.max(0, Math.min(order.length - 1, target));
    setDragY(rowTop - (listTop + dragIndex * rowH));
    if (target !== dragIndex) {
      setOrder((o) => moveItem(o, dragIndex, target));
      setDragIndex(target);
      setDragY(rowTop - (listTop + target * rowH));
    }
  };

  const onUp = () => {
    if (dragIndex === null) return;
    setDragIndex(null);
    setDragY(0);
  };

  const check = async () => {
    if (saving) return;
    if (order.every((x, i) => x === CORRECT[i])) {
      const points = tries === 0 ? 20 : 10;
      setEarned(points);
      playSfx('sparkle');
      setWon(true);
      setSaving(true); setSaveError(false);
      try { await api.submitMinigame(day, points); setTimeout(() => setDone(true), 1300); }
      catch { setWon(false); setSaveError(true); }
      finally { setSaving(false); }
      return;
    }
    // Sai: đếm lượt. Hết MAX_TRIES lượt → thua, tiêu ngày (không chơi lại).
    const used = tries + 1;
    setTries(used);
    playSfx('wrong');
    if (used >= MAX_TRIES) {
      setFailed(true);
      api.submitMinigame(day, 0).catch(() => {});
    } else {
      setWarn(true);
      setShake((n) => n + 1);
    }
  };

  const triesLeft = MAX_TRIES - tries;

  return (
    <GameShell
      act={actOfDay(day)}
      title={vi.minigames.sort.title}
      intro={vi.minigames.sort.intro}
      hud={<GameStat icon="sparkle" value={vi.minigames.sort.tries(triesLeft)} tone={triesLeft <= 1 ? 'accent' : 'info'} />}
      footer={won
        ? <div className="rounded-card bg-success/90 p-3 text-center font-bold text-on-primary shadow-pop">🎉 Chính xác!</div>
        : <Button onClick={check} loading={saving} block>{vi.minigames.common.check}</Button>}
    >
      {warn && <div className="mb-2"><Banner kind="error">{triesLeft <= 1 ? vi.minigames.sort.lastTry : vi.minigames.sort.wrong}</Banner></div>}
      {saveError && <div className="mb-2"><Banner kind="error">Chưa lưu được điểm. Bấm Kiểm tra để thử lại.</Banner></div>}

      <div className="mb-2 flex items-center justify-between px-1 text-caption font-bold">
        <span className="flex items-center gap-1 text-success"><Icon name="leaf" size={14} filled /> Ít đường</span>
        <span className="flex items-center gap-1 text-danger">Nhiều đường <Icon name="drop" size={14} filled /></span>
      </div>

      <div ref={listRef} className={`flex flex-col gap-2.5 ${warn ? 'shake' : ''}`} key={shake}>
        {order.map((item, i) => {
          const ok = won; // chỉ lộ đúng/sai SAU khi thắng — tránh gợi ý trước lúc Kiểm tra
          const fill = ((i + 1) / order.length) * 100;
          const dragging = i === dragIndex;
          return (
            <div
              key={item}
              onPointerDown={(e) => onDown(e, i)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              style={{ touchAction: 'none', transform: dragging ? `translateY(${dragY}px)` : undefined, transition: dragging ? 'none' : 'transform .18s ease' }}
              className={`flex select-none items-center gap-3 rounded-card border bg-surface/95 p-3 shadow-soft backdrop-blur ${dragging ? 'drag-ghost cursor-grabbing' : 'cursor-grab'} ${won ? 'border-success bump' : 'border-border'} ${!dragging && !won ? 'pop-in' : ''}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-small font-extrabold ${ok ? 'bg-success text-on-primary' : 'bg-accent/20 text-accent'}`}>
                {ok ? <Icon name="check" size={18} strokeWidth={2.4} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-1.5 block truncate text-small font-bold">{item}</span>
                <span className="sweet-meter"><span className="sweet-fill" style={{ width: `${fill}%` }} /></span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-border-strong/50">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" /><circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" /><circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" /></svg>
              </span>
            </div>
          );
        })}
      </div>

      <Confetti fire={won ? 1 : 0} />
    </GameShell>
  );
}
