import { ufoArt } from '../../lib/arcadeArt';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArcadeOverlay, ArcadeStage } from '../../components/ArcadeStage';
import { Banner } from '../../components/Banner';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { playSfx } from '../../lib/sfx';
import { useArcadeLoop } from '../../lib/useArcadeLoop';
import { getQuality, type Tier } from '../../lib/quality';
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
  // Cache gradient sky theo (w, h, act) — tránh tạo object mới mỗi frame
  const skyCache = useRef<{ w: number; h: number; act: number; g: CanvasGradient | null }>({ w: 0, h: 0, act: 0, g: null });
  const [mode, setMode] = useState<Mode>('ready');
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [award, setAward] = useState<number>(m?.points ?? 20);

  const to = (mo: Mode) => { g.current.mode = mo; setMode(mo); };
  // Chốt ván: trao điểm mốc rồi chuyển sang màn hoàn thành (không cho chơi lại).
  const finish = (pts: number) => {
    setAward(pts); to('won'); playSfx('win');
    setTimeout(() => setDone(true), 700);
  };

  const reset = useCallback(() => {
    const s = g.current;
    s.by = s.h * 0.42; s.byPrev = s.by; s.vy = 0; s.pipes = []; s.score = 0; s.acc = 0; s.rot = 0;
    setScore(0); to('ready');
  }, []);

  const flap = useCallback(() => {
    const s = g.current;
    if (s.mode === 'won') return;
    if (s.mode === 'dead') { reset(); }
    const s2 = g.current;
    if (s2.mode === 'ready') to('play');
    s2.vy = -0.68 * s2.h; // lực vỗ cánh, tỉ lệ theo chiều cao khung
    s2.thrust = 1;
    s2.rot = -0.18;        // hất mũi LÊN ngay khi vỗ (cảm giác nhạy như Flappy thật)
    playSfx('pop');
  }, [reset]);

  // Bàn phím: Space / ↑ để vỗ cánh
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap]);

  // Không truyền fpsCapOverride → quality system tự quyết: low=30fps, mid=60fps, high=60fps.
  // Adaptive downgrade hạ cả DPR lẫn frameInterval khi máy đuối — bắt được mọi loại thiết bị.
  useArcadeLoop(boxRef, canvasRef, (ctx, w, h, dt) => {
    const s = g.current;
    if (s.w !== w || s.h !== h) { s.w = w; s.h = h; if (s.mode === 'ready') s.by = h * 0.42; }
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

    draw(ctx, w, h, s, act, { birdX, birdR, gap, pipeW, alpha, tier, skyCache: skyCache.current });
  });

  if (done) return <MissionDone day={day} points={award} earnedPoints={award} note={`Bạn lách qua ${score} cột đường — ăn +${award} điểm!`} />;

  const hud = (
    <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-surface/90 px-3 py-1.5 text-small font-extrabold text-primary shadow-soft backdrop-blur">
      {score}<span className="text-caption font-semibold text-muted">/ {MAX}</span>
    </span>
  );

  return (
    <ArcadeStage act={act} title="Flappy Gumi" hint={vi.flight.hint} hud={hud} boxRef={boxRef} canvasRef={canvasRef} onPointerDown={flap}
      overlay={
        mode === 'ready' ? (
          <ArcadeOverlay>
            <p className="text-title font-extrabold text-white drop-shadow">{vi.flight.ready}</p>
            <p className="max-w-xs text-small font-medium text-white/90">Qua <b>20 cột</b> là đạt (+20). Cố thêm <b>50 cột</b> (+50) và <b>100 cột</b> (+100)! Chạm màn hình hoặc bấm Space.</p>
            <button type="button" onClick={flap} className="rounded-pill border border-black/15 bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{vi.minigames.common.start}</button>
          </ArcadeOverlay>
        ) : mode === 'dead' ? (
          <ArcadeOverlay>
            <Banner kind="error">Ối! Mới {score} cột, chưa đủ 20 để đạt. Thử lại nào!</Banner>
            <button type="button" onClick={flap} className="rounded-pill border border-black/15 bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{vi.minigames.common.retry}</button>
          </ArcadeOverlay>
        ) : null
      }
    />
  );
}

/* ---- Vẽ ---- */
type SkyCache = { w: number; h: number; act: number; g: CanvasGradient | null };
const SKY: Record<1 | 2 | 3, [string, string]> = { 1: ['#BFE9FB', '#F6E8DC'], 2: ['#CDE7C6', '#EFE2C4'], 3: ['#CFE6FA', '#EAF2FB'] };

// Phân tầng đồ hoạ theo Tier — mỗi tier cắt đúng phần nặng nhất của nó:
//   low : fillRect thuần, không path, không gradient, không cloud, không thruster
//   mid : gradient sky cached, không cloud (12 arc/frame → 0), pipe flat, 1 thruster
//   high: gradient sky cached, 3 cloud, pipe gradient, 3 thruster

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: State, act: 1 | 2 | 3, d: { birdX: number; birdR: number; gap: number; pipeW: number; alpha: number; tier: Tier; skyCache: SkyCache }) {
  const { tier } = d;
  // Integer coords: `n | 0` fast-floor → tránh subpixel anti-aliasing trên mobile Canvas 2D
  const by = (s.byPrev + (s.by - s.byPrev) * d.alpha) | 0;
  const [c0, c1] = SKY[act];

  // --- Nền ---
  if (tier === 'low') {
    ctx.fillStyle = c0; ctx.fillRect(0, 0, w, h);
  } else {
    const sc = d.skyCache;
    if (sc.w !== w || sc.h !== h || sc.act !== act || !sc.g) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, c0); sky.addColorStop(1, c1);
      sc.g = sky; sc.w = w; sc.h = h; sc.act = act;
    }
    ctx.fillStyle = sc.g; ctx.fillRect(0, 0, w, h);
    // Mây: chỉ high — 3 cloud × 4 arc = 12 arc/frame, bỏ ở mid để tiết kiệm CPU
    if (tier === 'high') {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 3; i++) { const cx = ((s.t * 12 + i * w * 0.42) % (w + 160)) - 80, cy = h * (0.14 + i * 0.12); cloud(ctx, cx, cy, 26 + i * 6); }
    }
  }

  // --- Cột đường ---
  for (const p of s.pipes) {
    const px = (p.xPrev + (p.x - p.xPrev) * d.alpha) | 0;
    // Clamp về [0, h] để tránh height âm khi gap gần mép canvas (gây IndexSizeError ở arcTo)
    const topH = Math.max(0, (p.gapY - d.gap / 2) | 0);
    const botY = Math.min(h, (p.gapY + d.gap / 2) | 0);
    pipe(ctx, px, 0, d.pipeW, topH, true, tier);
    pipe(ctx, px, botY, d.pipeW, Math.max(0, h - botY), false, tier);
  }

  // --- Đất ---
  const groundY = (h * 0.95) | 0;
  ctx.fillStyle = act === 2 ? '#B98A5E' : act === 3 ? '#C9B79E' : '#E4C08C';
  ctx.fillRect(0, groundY, w, h - groundY);

  // --- Chim (UFO Gumi) ---
  const r = d.birdR;
  if (tier === 'low') {
    // Bỏ save/translate/rotate/restore — vẽ thẳng integer coords, không subpixel, nhanh nhất có thể
    if (ufoArt.complete && ufoArt.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(ufoArt, (d.birdX - r * 1.5) | 0, (by - r * 1.05) | 0, (r * 3) | 0, (r * 1.85) | 0);
      ctx.imageSmoothingEnabled = true;
    }
  } else {
    ctx.save();
    ctx.translate(d.birdX | 0, by); ctx.rotate(s.rot * .3);
    // Thruster: high = 3 luồng gradient, mid = 1 luồng flat
    const offsets = tier === 'high' ? [-.65, 0, .65] : [0];
    for (const off of offsets) {
      const len = r * (.25 + s.thrust * (1.15 + Math.sin(s.t * 65 + off) * .2));
      ctx.beginPath();
      ctx.moveTo(off * r - r * .15, r * .4);
      ctx.quadraticCurveTo(off * r - r * .22, r * .8, off * r, r * .4 + len);
      ctx.quadraticCurveTo(off * r + r * .22, r * .8, off * r + r * .15, r * .4);
      if (tier === 'high') {
        const glow = ctx.createLinearGradient(0, r * .4, 0, r * .4 + len);
        glow.addColorStop(0, '#e8fcff'); glow.addColorStop(.3, '#65dbff'); glow.addColorStop(1, '#42aaff00');
        ctx.fillStyle = glow;
      } else {
        ctx.fillStyle = '#65dbff';
      }
      ctx.fill();
    }
    if (ufoArt.complete && ufoArt.naturalWidth) ctx.drawImage(ufoArt, -r * 1.5, -r * 1.05, r * 3, r * 1.85);
    ctx.restore();
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7); ctx.arc(x + r, y + r * 0.2, r * 0.8, 0, 7);
  ctx.arc(x - r, y + r * 0.2, r * 0.75, 0, 7); ctx.arc(x + r * 0.4, y - r * 0.5, r * 0.7, 0, 7);
  ctx.fill();
}

function pipe(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, top: boolean, tier: Tier) {
  const capH = Math.min(18, w * 0.4) | 0;
  const capY = top ? y + hh - capH : y;

  if (tier === 'low') {
    // fillRect thuần — không path, không gradient: nhanh nhất có thể
    ctx.fillStyle = '#EE7DA0'; ctx.fillRect(x, y, w, hh);
    ctx.fillStyle = '#C94E74'; ctx.fillRect(x - 4, capY, w + 8, capH);
    return;
  }

  if (tier === 'mid') {
    // Flat color + highlight — không createLinearGradient (bỏ 2 gradient object/pipe/frame)
    // round() giữ rounded-corner đẹp hơn low nhưng không tốn gradient
    ctx.fillStyle = '#EE7DA0'; round(ctx, x, y, w, hh, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    round(ctx, x + w * 0.16, y, Math.max(3, w * 0.12), hh, 4); ctx.fill();
    ctx.fillStyle = '#C94E74';
    round(ctx, x - 4, capY, w + 8, capH, 6); ctx.fill();
    return;
  }

  // High: gradient đầy đủ
  const body = ctx.createLinearGradient(x, 0, x + w, 0);
  body.addColorStop(0, '#F2A0B8'); body.addColorStop(0.5, '#EE7DA0'); body.addColorStop(1, '#D45E82');
  ctx.fillStyle = body; round(ctx, x, y, w, hh, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  round(ctx, x + w * 0.16, y, Math.max(3, w * 0.12), hh, 4); ctx.fill();
  ctx.fillStyle = '#C94E74';
  round(ctx, x - 4, capY, w + 8, capH, 6); ctx.fill();
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w <= 0 || h <= 0) return; // guard: negative dimensions crash arcTo
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
