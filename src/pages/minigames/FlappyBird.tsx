import { prepareUfoArt, ufoArt } from '../../lib/ufoArt';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './day7-flight.css';
import { useParams } from 'react-router-dom';
import { ArcadeOverlay, ArcadeStage } from '../../components/ArcadeStage';
import { Banner } from '../../components/Banner';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { playSfx } from '../../lib/sfx';
import { useDay7FlightLoop } from '../../lib/useDay7FlightLoop';
import { getQuality } from '../../lib/quality';
import { vi } from '../../content/vi';

const PASS = 20;  // qua 20 cột = ĐẠT (tính streak) — pass rồi KHÔNG cho chơi lại
const MAX = 100;  // tối đa 100 cột
// Điểm = mốc CAO NHẤT đạt được trong 1 lần chơi: 20 / 50 / 100 cột → +20 / +50 / +100.
const milestone = (n: number) => (n >= 100 ? 100 : n >= 50 ? 50 : n >= PASS ? PASS : 0);

type Mode = 'ready' | 'play' | 'dead' | 'won';
interface Pipe { x: number; xPrev: number; gapY: number; scored: boolean }
interface State { mode: Mode; by: number; byPrev: number; vy: number; pipes: Pipe[]; score: number; w: number; h: number; t: number; best: number; acc: number; rot: number; thrust: number }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Ngày 7 — "Bay Qua Cơn Thèm": Flappy. Qua 20 cột là ĐẠT (+20); cố thêm 50/100 cột để +50/+100.
 *  Một lần chơi liền mạch tới khi chết hoặc đạt trần 100 cột; pass (≥20) rồi không cho chơi lại. */
export function FlappyBird() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 7;
  const m = vi.missions[day - 1];
  const act = actOfDay(day);

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<State>({ mode: 'ready', by: 0, byPrev: 0, vy: 0, pipes: [], score: 0, w: 1, h: 1, t: 0, best: 0, acc: 0, rot: 0, thrust: 0 });
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastFlapSound = useRef(-Infinity);
  const birdRef = useRef<HTMLDivElement>(null);
  const pipesRef = useRef<(HTMLDivElement | null)[]>([]);
  const cloudsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [artReady, setArtReady] = useState(false);
  const [artError, setArtError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [mode, setMode] = useState<Mode>('ready');
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [award, setAward] = useState<number>(m?.points ?? 20);

  useEffect(() => {
    let cancelled = false;
    setArtError(false);
    void prepareUfoArt().then(() => { if (!cancelled) setArtReady(true); })
      .catch(() => { if (!cancelled) setArtError(true); });
    return () => { cancelled = true; };
  }, [loadAttempt]);

  const to = (mo: Mode) => { g.current.mode = mo; setMode(mo); };
  // Chốt ván: trao điểm mốc rồi chuyển sang màn hoàn thành (không cho chơi lại).
  const finish = (pts: number) => {
    setAward(pts); to('won'); playSfx('win');
    finishTimer.current = setTimeout(() => setDone(true), 700);
  };

  const reset = useCallback(() => {
    const s = g.current;
    s.by = s.h * 0.42; s.byPrev = s.by; s.vy = 0; s.pipes = []; s.score = 0; s.acc = 0; s.rot = 0;
    setScore(0); to('ready');
  }, []);

  const flap = useCallback(() => {
    const s = g.current;
    if (!artReady || document.hidden || s.mode === 'won') return;
    if (s.mode === 'dead') { reset(); }
    const s2 = g.current;
    if (s2.mode === 'ready') to('play');
    s2.vy = -0.68 * s2.h; // lực vỗ cánh, tỉ lệ theo chiều cao khung
    s2.thrust = 1;
    s2.rot = -0.18;        // hất mũi LÊN ngay khi vỗ (cảm giác nhạy như Flappy thật)
    const now = performance.now();
    if (now - lastFlapSound.current >= 100) { playSfx('pop'); lastFlapSound.current = now; }
  }, [reset, artReady]);

  // Bàn phím: Space / ↑ để vỗ cánh
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (!e.repeat) flap(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap]);

  useEffect(() => {
    if (done) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const visible = () => { g.current.acc = 0; };
    document.addEventListener('visibilitychange', visible);
    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(finishTimer.current);
      document.removeEventListener('visibilitychange', visible);

    };
  }, [done]);

  // Physics stays fixed-step; only compositor transforms change each frame.
  useDay7FlightLoop(boxRef, (w, h, dt) => {
    const s = g.current;
    if (s.w !== w || s.h !== h) {
      if (s.w > 1 && s.h > 1) {
        const sx = w / s.w, sy = h / s.h;
        s.by *= sy; s.byPrev *= sy; s.vy *= sy;
        for (const p of s.pipes) { p.x *= sx; p.xPrev *= sx; p.gapY *= sy; }
      }
      s.w = w; s.h = h;
      if (s.mode === 'ready') s.by = h * 0.42;
    }
    s.t += dt;
    const tier = getQuality().tier;
    // Thrust/rot chỉ dùng để vẽ hiệu ứng — skip tính toán trên máy yếu
    if (tier !== 'low') s.thrust = Math.max(0, s.thrust - dt * 2.8);

    const birdX = w * 0.3, birdR = clamp(h * 0.034, 12, 22);
    const gap = h * 0.34, pipeW = clamp(w * 0.13, 46, 80);
    const spacing = clamp(w * 0.56, 200, 380);
    const speed = 235 * (h / 620);

    const die = () => {
      if (s.mode !== 'play') return;
      s.best = Math.max(s.best, s.score);
      if (s.score >= PASS) finish(milestone(s.score));
      else { to('dead'); playSfx('sleep'); }
    };

    // STEP 1/60: 2 bước/frame ở 30fps, 1 bước ở 60fps — đủ chính xác cho Flappy Bird.
    // Accumulator cap = 3×STEP = 0.05s → tối đa 3 bước/frame, chống spike sau tab ẩn.
    const STEP = 1 / 60;
    s.acc = Math.min(s.acc + dt, 0.05);
    let pendingScore = -1; // gom setScore/playSfx ra ngoài loop — tránh gọi React/Audio trong vòng lặp vật lý
    while (s.mode === 'play' && s.acc >= STEP) {
      s.acc -= STEP;
      s.byPrev = s.by;
      for (const p of s.pipes) p.xPrev = p.x;
      s.vy += 2.1 * h * STEP;
      s.by += s.vy * STEP;
      if (s.by - birdR < 0) { s.by = birdR; s.vy = 0; }
      const last = s.pipes[s.pipes.length - 1];
      if (!last || last.x < w - spacing) { const m = gap * 0.62; s.pipes.push({ x: w + pipeW, xPrev: w + pipeW, gapY: m + Math.random() * (h - 2 * m), scored: false }); }
      for (const p of s.pipes) p.x -= speed * STEP;
      for (const p of s.pipes) {
        if (!p.scored && p.x + pipeW < birdX - birdR) {
          p.scored = true; s.score = Math.min(MAX, s.score + 1);
          pendingScore = s.score;          // defer: gọi sau khi thoát loop
          if (s.score >= MAX) finish(MAX);
        }
      }
      // KHÔNG filter trong loop — tránh tạo array mới 2-4× / frame (GC pressure)
      for (const p of s.pipes) if (p.x < birdX + birdR && p.x + pipeW > birdX - birdR && (s.by - birdR < p.gapY - gap / 2 || s.by + birdR > p.gapY + gap / 2)) die();
      if (s.by + birdR >= h) { s.by = h - birdR; die(); }
    }
    // Dọn pipe + cập nhật score MỘT LẦN / frame (không phải mỗi bước vật lý)
    while (s.pipes.length && s.pipes[0].x + pipeW <= -20) s.pipes.shift();
    if (pendingScore >= 0) { setScore(pendingScore); playSfx('sparkle'); }

    if (s.mode === 'ready') s.by = h * 0.42 + Math.sin(s.t * 2.2) * h * 0.02;

    if (tier !== 'low') {
      const target = clamp((s.vy / h) * 1.7, -0.5, 1.15);
      s.rot += (target - s.rot) * (1 - Math.exp(-dt * 10));
    }

    let alpha = 1;
    if (s.mode === 'play') alpha = clamp(s.acc / STEP, 0, 1);
    else { s.byPrev = s.by; for (const p of s.pipes) p.xPrev = p.x; }

    const by = s.byPrev + (s.by - s.byPrev) * alpha;
    const bird = birdRef.current;
    if (bird) {
      const size = `${birdR * 3}px`;
      if (bird.style.width !== size) {
        bird.style.width = size; bird.style.height = `${birdR * 1.85}px`;
      }
      bird.style.transform = `translate3d(${birdX - birdR * 1.5}px,${by - birdR * 1.05}px,0) rotate(${s.rot * .3}rad)`;
      bird.style.setProperty('--thrust', String(.25 + s.thrust));
    }
    for (let i = 0; i < pipesRef.current.length; i++) {
      const node = pipesRef.current[i];
      if (!node) continue;
      const p = s.pipes[i];
      if (!p) { if (!node.hidden) node.hidden = true; continue; }
      node.hidden = false;
      const top = Math.max(0, p.gapY - gap / 2);
      const bottom = Math.min(h, p.gapY + gap / 2);
      // Geometry changes only on spawn/resize, not while a pipe travels.
      const geometry = `${pipeW}:${top}:${bottom}:${h}`;
      if (node.dataset.geometry !== geometry) {
        node.style.width = `${pipeW}px`;
        node.style.setProperty('--pipe-top', `${top}px`);
        node.style.setProperty('--pipe-bottom', `${bottom}px`);
        node.style.setProperty('--pipe-height', `${h - bottom}px`);
        node.dataset.geometry = geometry;
      }
      node.style.transform = `translate3d(${p.xPrev + (p.x - p.xPrev) * alpha}px,0,0)`;
    }
    for (let i = 0; i < cloudsRef.current.length; i++) {
      const node = cloudsRef.current[i];
      if (!node) continue;
      const cx = ((s.t * (tier === 'high' ? 12 : 0) + i * w * .42) % (w + 160)) - 80;
      node.style.transform = `translate3d(${cx}px,${h * (.14 + i * .12)}px,0)`;
    }
  }, !done);

  if (done) return <MissionDone day={day} points={award} earnedPoints={award} note={`Bạn lách qua ${score} cột đường — ăn +${award} điểm!`} />;

  const hud = (
    <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-surface/90 px-3 py-1.5 text-small font-extrabold text-primary shadow-soft backdrop-blur">
      {score}<span className="text-caption font-semibold text-muted">/ {MAX}</span>
    </span>
  );

  return createPortal(
    <div className="day7-flight"><ArcadeStage act={act} title="Flappy Gumi" hint={vi.flight.hint} hud={hud} boxRef={boxRef} canvasRef={canvasRef} onPointerDown={flap}
      scenery={<div className={`day7-scene day7-scene-${act}`} aria-hidden="true">
        {[0, 1, 2].map(i => <div key={i} className="day7-cloud" ref={node => { cloudsRef.current[i] = node; }} />)}
        {Array.from({ length: 24 }, (_, i) => <div key={i} hidden className="day7-pipe" ref={node => { pipesRef.current[i] = node; }}><div className="day7-pipe-top"/><div className="day7-pipe-bottom"/></div>)}
        <div className="day7-ground"/>
        <div ref={birdRef} className="day7-ufo"><i/><img src={ufoArt.src} alt="" draggable={false}/></div>
      </div>}
      overlay={
        mode === 'ready' ? (
          <ArcadeOverlay>
            <p className="text-title font-extrabold text-white drop-shadow">{vi.flight.ready}</p>
            <p className="max-w-xs text-small font-medium text-white/90">Qua <b>20 cột</b> là đạt (+20). Cố thêm <b>50 cột</b> (+50) và <b>100 cột</b> (+100)! Chạm màn hình hoặc bấm Space.</p>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} disabled={!artReady && !artError} aria-busy={!artReady && !artError} onClick={artError ? () => setLoadAttempt(n => n + 1) : flap} className="rounded-pill border border-black/15 bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{artError ? 'Tải lại hình ảnh' : artReady ? vi.minigames.common.start : 'Đang tải hình ảnh…'}</button>
          </ArcadeOverlay>
        ) : mode === 'dead' ? (
          <ArcadeOverlay>
            <Banner kind="error">Ối! Mới {score} cột, chưa đủ 20 để đạt. Thử lại nào!</Banner>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={flap} className="rounded-pill border border-black/15 bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{vi.minigames.common.retry}</button>
          </ArcadeOverlay>
        ) : null
      }
    /></div>, document.body
  );
}
