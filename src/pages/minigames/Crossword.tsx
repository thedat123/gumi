import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { Banner } from '../../components/Banner';
import { Confetti, GameShell, GameStat } from '../../components/GameShell';
import { Gumi } from '../../components/Gumi';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { vi } from '../../content/vi';
import { playSfx } from '../../lib/sfx';

const TIME_LIMIT = 180; // brief: 3 phút
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '');

/** Ngày 16 — Gumi Bắt Chữ (crossword): đoán từ khoá mỗi dòng theo gợi ý. Hết 3 phút là dừng, không chơi lại. */
export function Crossword() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 16;
  const m = vi.missions[day - 1];
  const cfg = vi.minigames.crossword;
  const rows = cfg.rows;

  const [values, setValues] = useState<string[]>(() => rows.map(() => ''));
  const [solved, setSolved] = useState<boolean[]>(() => rows.map(() => false));
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const allSolved = solved.every(Boolean);

  // Đồng hồ đếm ngược 3 phút. Hết giờ → THUA, khoá màn, tiêu ngày (không cho thử lại).
  useEffect(() => {
    if (done || failed || allSolved) return;
    if (timeLeft <= 0) {
      setFailed(true);
      playSfx('wrong');
      api.submitMinigame(day).catch(() => {});
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, done, failed, allSolved, day]);

  if (!m) return <Banner kind="error">Không có nhiệm vụ này.</Banner>;
  if (done) return <MissionDone day={day} points={m.points} note={cfg.success} />;

  const solvedCount = solved.filter(Boolean).length;
  if (failed) return (
    <div className="flex flex-col items-center gap-3 pt-6 text-center">
      <Gumi state="hap_hoi" size={140} />
      <Banner kind="error">{vi.minigames.common.timeUp}</Banner>
      <p className="max-w-xs text-small text-muted">{cfg.timeUp(solvedCount, rows.length)}</p>
      <Link to="/journey" className="mt-1 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-6 font-semibold text-on-primary shadow-pop">{vi.minigames.common.backHome}</Link>
    </div>
  );

  const onType = (i: number, raw: string) => {
    if (solved[i]) return;
    const val = norm(raw).slice(0, rows[i]!.answer.length);
    setValues((arr) => arr.map((x, k) => (k === i ? val : x)));
    if (val === rows[i]!.answer) {
      playSfx('happy');
      const ns = solved.map((s, k) => (k === i ? true : s));
      setSolved(ns);
      if (ns.every(Boolean)) { setBurst((b) => b + 1); api.submitMinigame(day).catch(() => {}); setTimeout(() => setDone(true), 900); }
    }
  };

  const mmss = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  return (
    <GameShell act={actOfDay(day)} title={cfg.title} intro={cfg.intro}
      hud={<><GameStat icon="clock" value={mmss} tone={timeLeft <= 15 ? 'accent' : 'info'} /><GameStat icon="check" value={`${solvedCount}/${rows.length}`} tone="success" /></>}>
      <div className="flex flex-1 flex-col justify-center gap-2.5">
        {rows.map((r, i) => {
          const val = values[i]!;
          const ok = solved[i];
          return (
            <div key={i} className={`rounded-card border-2 p-3 shadow-soft transition-colors ${ok ? 'border-success/60 bg-success/10' : 'border-border-strong/40 bg-surface'}`}>
              <p className="mb-2 text-small font-semibold leading-snug"><span className="font-extrabold text-primary">{i + 1}.</span> {r.clue}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {Array.from(r.answer).map((ch, k) => (
                  <span key={k} className={`flex h-9 w-8 items-center justify-center rounded-md border-2 text-body font-extrabold uppercase ${ok ? 'border-success bg-success/20 text-success' : val[k] ? 'border-primary/50 bg-surface text-text' : 'border-border-strong/50 bg-bg/50 text-muted'}`}>{ok ? ch : (val[k] ?? '')}</span>
                ))}
              </div>
              {!ok && (
                <input
                  value={val}
                  onChange={(e) => onType(i, e.target.value)}
                  maxLength={r.answer.length}
                  aria-label={`Đáp án dòng ${i + 1}`}
                  autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
                  placeholder={`${r.answer.length} chữ cái`}
                  className="mt-2 w-full rounded-control border-2 border-border-strong bg-surface px-3 py-2 text-body uppercase tracking-[0.3em] outline-none transition-shadow focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              )}
            </div>
          );
        })}
      </div>
      <Confetti fire={burst} />
    </GameShell>
  );
}
