import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { prepareUfoArt, ufoArt } from '../../lib/ufoArt';
import { flightSize, flightAward, FLIGHT_GRAVITY, FLIGHT_HEIGHT, FLIGHT_IMPULSE, FLIGHT_SPEED, FLIGHT_STEP } from '../../lib/flight';
import { useDomGameLoop } from '../../lib/useDomGameLoop';
import { playSfx } from '../../lib/sfx';
import { vi } from '../../content/vi';
import './flappy.css';

const MissionDone = lazy(() => import('../../components/MissionDone').then(m => ({ default: m.MissionDone })));
type Mode = 'ready' | 'play' | 'dead' | 'won';
interface Pipe { x: number; gapY: number; scored: boolean }
interface Flight { mode: Mode; y: number; velocity: number; pipes: Pipe[]; width: number; score: number; accumulator: number }
const RADIUS = 20;
const GAP = FLIGHT_HEIGHT * .34;
const PIPE_WIDTH = 58;
const BIRD_WIDTH = 78;
const BIRD_HEIGHT = 48;

/** Day 7 and the event share physics; day 7 keeps its 20 / 50 / 100 awards. */
export function EventFlappyBird({ eventFinish }: { eventFinish?: (score: number) => void } = {}) {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 7;
  const field = useRef<HTMLDivElement>(null);
  const pipeNodes = useRef<(HTMLDivElement | null)[]>([]);
  const bird = useRef<HTMLDivElement>(null);
  const engine = useRef<Flight>({ mode: 'ready', y: FLIGHT_HEIGHT * .42, velocity: 0, pipes: [], width: 1, score: 0, accumulator: 0 });
  const attempts = useRef(0), best = useRef(0), finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSound = useRef(-Infinity);
  const [mode, setMode] = useState<Mode>('ready');
  const [score, setScore] = useState(0);
  const [award, setAward] = useState(0);
  const [done, setDone] = useState(false);
  const [spriteReady, setSpriteReady] = useState(false);
  const [spriteError, setSpriteError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setSpriteError(false);
    void prepareUfoArt().then(() => { if (!cancelled) setSpriteReady(true); })
      .catch(() => { if (!cancelled) setSpriteError(true); });
    return () => { cancelled = true; };
  }, [loadAttempt]);
  const [paused, setPaused] = useState(document.hidden);
  const [quiet, setQuiet] = useState(false);
  const quietRef = useRef(quiet); quietRef.current = quiet;
  const target = eventFinish ? 40 : 100;

  const sound = useCallback((name: 'pop' | 'sparkle' | 'sleep' | 'win') => {
    if (!quietRef.current) playSfx(name);
  }, []);
  const flap = useCallback(() => {
    const s = engine.current;
    if (!spriteReady || document.hidden || s.mode === 'won') return;
    if (s.mode === 'ready' || s.mode === 'dead') {
      s.y = FLIGHT_HEIGHT * .42; s.velocity = 0; s.pipes = []; s.score = 0; s.accumulator = 0;
      s.mode = 'play'; setMode('play'); setScore(0);
    }
    s.velocity = FLIGHT_IMPULSE;
    const now = performance.now();
    if (now - lastSound.current > 100) { sound('pop'); lastSound.current = now; }
  }, [sound, spriteReady]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault(); if (!e.repeat) flap();
      }
    };
    const visibility = () => { engine.current.accumulator = 0; setPaused(document.hidden); };
    window.addEventListener('keydown', key); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', visibility); clearTimeout(finishTimer.current); };
  }, [flap]);

  useDomGameLoop(field, (cssWidth, cssHeight, dt) => {
    const { w, h } = flightSize(cssWidth, cssHeight);
    const scale = cssHeight / h;
    const s = engine.current;
    if (s.width !== w) {
      if (s.width > 1) for (const p of s.pipes) p.x *= w / s.width;
      s.width = w;
    }
    const birdX = w * .3;
    const finish = (columns: number) => {
      if (s.mode === 'won') return;
      s.mode = 'won'; setMode('won'); sound('win');
      if (eventFinish) eventFinish(columns);
      else { setAward(flightAward(columns)); finishTimer.current = setTimeout(() => setDone(true), 450); }
    };
    const die = () => {
      if (s.mode !== 'play') return;
      best.current = Math.max(best.current, s.score);
      if (eventFinish) { attempts.current++; if (attempts.current >= 5) { finish(best.current); return; } }
      else if (s.score >= 20) { finish(s.score); return; }
      s.mode = 'dead'; setMode('dead'); sound('sleep');
    };
    const wasPlaying = s.mode === 'play';
    if (wasPlaying) {
      s.accumulator = Math.min(s.accumulator + dt, .1);
      let changedScore = false;
      while (s.mode === 'play' && s.accumulator >= FLIGHT_STEP) {
        s.accumulator -= FLIGHT_STEP;
        s.velocity += FLIGHT_GRAVITY * FLIGHT_STEP;
        s.y += s.velocity * FLIGHT_STEP;
        if (s.y < RADIUS) { s.y = RADIUS; s.velocity = 0; }
        const last = s.pipes[s.pipes.length - 1];
        const spacing = Math.max(200, Math.min(380, w * .56));
        if (!last || last.x < w - spacing) {
          const margin = GAP * .62;
          s.pipes.push({ x: w + PIPE_WIDTH, gapY: margin + Math.random() * (h - 2 * margin), scored: false });
        }
        for (const p of s.pipes) {
          p.x -= FLIGHT_SPEED * FLIGHT_STEP;
          if (p.x < birdX + RADIUS && p.x + PIPE_WIDTH > birdX - RADIUS &&
              (s.y - RADIUS < p.gapY - GAP / 2 || s.y + RADIUS > p.gapY + GAP / 2)) { die(); break; }
          if (!p.scored && p.x + PIPE_WIDTH < birdX - RADIUS) {
            p.scored = true; s.score++; changedScore = true;
            if (s.score >= target) { finish(s.score); break; }
          }
        }
        if (s.mode === 'play' && s.y + RADIUS >= h) { s.y = h - RADIUS; die(); }
      }
      while (s.pipes.length && s.pipes[0].x + PIPE_WIDTH < -8) s.pipes.shift();
      if (changedScore) { setScore(s.score); if (s.mode === 'play') sound('sparkle'); }
    }
    // Every visible object is native-resolution DOM. No canvas clear/redraw or React frame updates.
    const prediction = s.mode === 'play' ? s.accumulator : 0;
    const y = Math.max(RADIUS, Math.min(h - RADIUS, s.y + s.velocity * prediction));
    if (bird.current) {
      const width = `${BIRD_WIDTH * scale}px`, height = `${BIRD_HEIGHT * scale}px`;
      if (bird.current.style.width !== width) bird.current.style.width = width;
      if (bird.current.style.height !== height) bird.current.style.height = height;
      bird.current.style.transform = `translate3d(-50%, ${(y - BIRD_HEIGHT / 2) * scale}px, 0) rotate(${Math.max(-10, Math.min(18, s.velocity * .03))}deg)`;
    }
    for (let i = 0; i < pipeNodes.current.length; i++) {
      const node = pipeNodes.current[i], p = s.pipes[i];
      if (!node) continue;
      if (!p) { if (!node.hidden) node.hidden = true; continue; }
      node.hidden = false;
      const top = Math.max(0, p.gapY - GAP / 2) * scale;
      const bottom = Math.min(h, p.gapY + GAP / 2) * scale;
      const geometry = `${top}:${bottom}:${scale}`;
      if (node.dataset.geometry !== geometry) {
        node.style.width = `${PIPE_WIDTH * scale}px`;
        node.style.setProperty('--flight-pipe-top', `${top}px`);
        node.style.setProperty('--flight-pipe-bottom', `${bottom}px`);
        node.style.setProperty('--flight-pipe-height', `${cssHeight - bottom}px`);
        node.style.setProperty('--flight-cap', `${14 * scale}px`);
        node.dataset.geometry = geometry;
      }
      node.style.transform = `translate3d(${(p.x - FLIGHT_SPEED * prediction) * scale}px,0,0)`;
    }
  }, !done && (mode === 'ready' || mode === 'play'));


  if (done) return <Suspense fallback={<div className="flight-saving" role="status">Đang mở kết quả…</div>}><MissionDone day={day} points={award} earnedPoints={award} note={`Bạn lách qua ${score} cột đường — ăn +${award} điểm!`} /></Suspense>;
  return <section className={`flight-stage game-shell ${eventFinish ? 'flight-event' : 'flight-day7'}`} aria-label="Flappy Gumi">
    <header className="flight-header">
      {!eventFinish && <Link to="/journey" className="flight-exit" aria-label="Thoát về hành trình">←</Link>}
      {/* Sự kiện: tên game đã có ở tiêu đề chặng → không lặp lại; thay bằng 1 dòng luật gọn. */}
      {eventFinish
        ? <div className="flight-title flight-rules"><b>Lượt {Math.min(attempts.current + 1, 5)}/5</b><small>Mục tiêu 40 cột</small></div>
        : <div className="flight-title"><small>{`CHẶNG ${day} / 14`}</small><h1>Flappy Gumi</h1></div>}
      <div className="flight-score" aria-label={`${score} cột đã vượt qua`}><strong>{score}</strong><small>/ {target} CỘT</small></div>
      <button className="flight-sound" onClick={() => setQuiet(q => !q)} aria-label={quiet ? 'Bật âm thanh' : 'Tắt âm thanh'} aria-pressed={quiet}>{quiet ? 'Âm tắt' : 'Âm bật'}</button>
    </header>
    {!eventFinish && <div className="flight-goals">{[20,50,100].map(n => <span key={n} className={score >= n ? 'reached' : ''}><b>{n} cột</b><small>+{n} điểm</small></span>)}</div>}
    <div className="flight-field" ref={field} onPointerDown={e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as Element).closest('button, a') || engine.current.mode !== 'play') return;
      e.preventDefault(); flap();
    }}>
      <div className="flight-horizon" aria-hidden="true"/>
      {Array.from({ length: 24 }, (_, i) => <div key={i} className="flight-pipe" hidden ref={node => { pipeNodes.current[i] = node; }} aria-hidden="true"><i/><i/></div>)}
      <div className={`flight-bird ${spriteReady ? 'has-sprite' : ''}`} ref={bird} aria-hidden="true"><span className="flight-fallback">●</span><img src={ufoArt.src} alt="" draggable={false} decoding="async"/></div>
      {(mode !== 'play' || paused) && <div className="flight-overlay"><div className="flight-dialog" role="status">
        <span className="flight-dialog-tag">{paused ? 'TẠM DỪNG' : mode === 'dead' ? 'THÊM MỘT LẦN NỮA!' : mode === 'won' ? 'HOÀN THÀNH' : 'BAY QUA CƠN THÈM'}</span>
        <h2>{paused ? 'Ván chơi đang tạm dừng' : mode === 'dead' ? `Bạn đã qua ${score} cột` : mode === 'won' ? 'Bay đẹp lắm!' : 'Sẵn sàng cất cánh?'}</h2>
        <p>{mode === 'dead' ? eventFinish ? `Lượt ${attempts.current}/5 · Kỷ lục ${best.current}/40. Thử lại nào!` : 'Qua 20 cột để đạt. Bay tiếp lên mốc 50 và 100 để nhận thêm điểm!' : eventFinish ? '5 lượt chơi · Đạt 40 cột để hoàn thành. Chạm hoặc bấm Space để bay.' : 'Chạm màn hình hoặc bấm Space / ↑ để bay. Giữ Gumi lọt qua khoảng trống giữa các cột.'}</p>
        {!paused && mode !== 'won' && <button className="flight-start" disabled={!spriteReady && !spriteError} aria-busy={!spriteReady && !spriteError} onClick={spriteError ? () => setLoadAttempt(n => n + 1) : flap}>{spriteError ? 'Tải lại hình ảnh' : !spriteReady ? 'Đang tải hình ảnh…' : mode === 'dead' ? vi.minigames.common.retry : vi.minigames.common.start}<span aria-hidden="true">→</span></button>}
      </div></div>}
    </div>
    {!eventFinish && <footer className="flight-footer"><span>CHẠM / SPACE / ↑ ĐỂ BAY</span><span>Qua 20 cột là đạt</span></footer>}
  </section>;
}
