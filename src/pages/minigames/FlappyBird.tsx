import { ufoArt } from '../../lib/arcadeArt';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { ArcadeOverlay, ArcadeStage } from '../../components/ArcadeStage';
import { Banner } from '../../components/Banner';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { playSfx } from '../../lib/sfx';
import { useArcadeLoop } from '../../lib/useArcadeLoop';
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
  const low = getQuality().tier === 'low'; // máy siêu yếu: nền phẳng + bỏ mây cho nhẹ

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<State>({ mode: 'ready', by: 0, byPrev: 0, vy: 0, pipes: [], score: 0, w: 1, h: 1, t: 0, best: 0, acc: 0, rot: 0, thrust: 0 });
  const [mode, setMode] = useState<Mode>('ready');
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [award, setAward] = useState<number>(m?.points ?? 20);

  const to = (mo: Mode) => { g.current.mode = mo; setMode(mo); };
  // Chốt ván: trao điểm mốc rồi chuyển sang màn hoàn thành (không cho chơi lại).
  const finish = (pts: number) => {
    setAward(pts); to('won'); playSfx('win');
    api.submitMinigame(day, pts).catch(() => {});
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
    s2.vy = -0.82 * s2.h; // lực vỗ cánh, tỉ lệ theo chiều cao khung
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

  useArcadeLoop(boxRef, canvasRef, (ctx, w, h, dt) => {
    const s = g.current;
    if (s.w !== w || s.h !== h) { s.w = w; s.h = h; if (s.mode === 'ready') s.by = h * 0.42; }
    s.t += dt; s.thrust = Math.max(0, s.thrust - dt * 2.8);

    // Kích thước phụ thuộc khung
    const birdX = w * 0.3, birdR = clamp(h * 0.034, 12, 22);
    const gap = h * 0.34, pipeW = clamp(w * 0.13, 46, 80);
    const spacing = clamp(w * 0.56, 200, 380);
    const speed = 235 * (h / 620);          // TỐC ĐỘ HẰNG SỐ như Flappy thật → cuộn đều, mượt

    // Vật lý FIXED-TIMESTEP (1/120s): chuyển động luôn mượt & ổn định dù frame-rate dao động.
    const die = () => {
      if (s.mode !== 'play') return;
      s.best = Math.max(s.best, s.score);
      if (s.score >= PASS) finish(milestone(s.score)); // đã ĐẠT → chốt điểm mốc, không chơi lại
      else { to('dead'); playSfx('sleep'); }            // chưa đạt 20 cột → cho chơi lại
    };
    const STEP = 1 / 120;
    s.acc = Math.min(s.acc + dt, 0.1);      // chống "spiral of death" khi tab bị nghẽn
    while (s.mode === 'play' && s.acc >= STEP) {
      s.acc -= STEP;
      s.byPrev = s.by;                       // chốt vị trí bước TRƯỚC để nội suy khi vẽ (siêu mượt mọi tần số quét)
      for (const p of s.pipes) p.xPrev = p.x;
      s.vy += 2.1 * h * STEP;               // trọng lực
      s.by += s.vy * STEP;
      if (s.by - birdR < 0) { s.by = birdR; s.vy = 0; }
      const last = s.pipes[s.pipes.length - 1];
      if (!last || last.x < w - spacing) { const m = gap * 0.62; s.pipes.push({ x: w + pipeW, xPrev: w + pipeW, gapY: m + Math.random() * (h - 2 * m), scored: false }); }
      for (const p of s.pipes) p.x -= speed * STEP;
      for (const p of s.pipes) {
        if (!p.scored && p.x + pipeW < birdX - birdR) {
          p.scored = true; s.score = Math.min(MAX, s.score + 1); setScore(s.score); playSfx('sparkle');
          if (s.score >= MAX) finish(MAX); // đạt trần 100 cột
        }
      }
      s.pipes = s.pipes.filter((p) => p.x + pipeW > -20);
      for (const p of s.pipes) if (p.x < birdX + birdR && p.x + pipeW > birdX - birdR && (s.by - birdR < p.gapY - gap / 2 || s.by + birdR > p.gapY + gap / 2)) die();
      if (s.by + birdR >= h) { s.by = h - birdR; die(); }
    }
    if (s.mode === 'ready') s.by = h * 0.42 + Math.sin(s.t * 2.2) * h * 0.02; // lơ lửng nhẹ

    // Xoay mượt: hất mũi lên khi bay, chúi xuống dần khi rơi (nội suy, không giật)
    const target = clamp((s.vy / h) * 1.7, -0.5, 1.15);
    s.rot += (target - s.rot) * Math.min(1, dt * 10);

    // NỘI SUY khi vẽ: chỉ khi đang bay mới nội suy giữa 2 bước vật lý; các chế độ khác vẽ đúng vị trí hiện tại.
    let alpha = 1;
    if (s.mode === 'play') alpha = clamp(s.acc / STEP, 0, 1);
    else { s.byPrev = s.by; for (const p of s.pipes) p.xPrev = p.x; }

    draw(ctx, w, h, s, act, { birdX, birdR, gap, pipeW, alpha, low });
  });

  if (done) return <MissionDone day={day} points={award} note={`Bạn lách qua ${score} cột đường — ăn +${award} điểm!`} />;

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
const SKY: Record<1 | 2 | 3, [string, string]> = { 1: ['#BFE9FB', '#F6E8DC'], 2: ['#CDE7C6', '#EFE2C4'], 3: ['#CFE6FA', '#EAF2FB'] };
function draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: State, act: 1 | 2 | 3, d: { birdX: number; birdR: number; gap: number; pipeW: number; alpha: number; low?: boolean }) {
  const a = d.alpha;
  const by = s.byPrev + (s.by - s.byPrev) * a;           // vị trí chim đã nội suy
  const [c0, c1] = SKY[act];
  // Máy siêu yếu: tô nền MỘT MÀU (rẻ hơn gradient toàn màn mỗi khung) và BỎ mây trang trí.
  if (d.low) {
    ctx.fillStyle = c0; ctx.fillRect(0, 0, w, h);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, c0); sky.addColorStop(1, c1);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // mây mềm
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 3; i++) { const cx = ((s.t * 12 + i * w * 0.42) % (w + 160)) - 80, cy = h * (0.14 + i * 0.12); cloud(ctx, cx, cy, 26 + i * 6); }
  }

  // cột "kẹo đường" (nội suy vị trí ngang → cuộn mượt tuyệt đối)
  for (const p of s.pipes) {
    const px = p.xPrev + (p.x - p.xPrev) * a;
    const top = p.gapY - d.gap / 2, bot = p.gapY + d.gap / 2;
    pipe(ctx, px, 0, d.pipeW, top, true);
    pipe(ctx, px, bot, d.pipeW, h - bot, false);
  }

  // đất
  ctx.fillStyle = act === 2 ? '#B98A5E' : act === 3 ? '#C9B79E' : '#E4C08C';
  ctx.fillRect(0, h - h * 0.05, w, h * 0.05);

  // chim Gumi (góc xoay đã nội suy mượt)
  const rot = s.rot;
  ctx.save();
  ctx.translate(d.birdX, by); ctx.rotate(rot * .3);
  const r = d.birdR;
  // Three thrusters brighten immediately on input, then cool down.
  for (const offset of [-.65, 0, .65]) {
    const length = r * (.25 + s.thrust * (1.15 + Math.sin(s.t * 65 + offset) * .2));
    const glow = ctx.createLinearGradient(0, r * .4, 0, r * .4 + length);
    glow.addColorStop(0, '#e8fcff'); glow.addColorStop(.3, '#65dbff'); glow.addColorStop(1, '#42aaff00');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.moveTo(offset * r - r * .15, r * .4); ctx.quadraticCurveTo(offset * r - r * .22, r * .8, offset * r, r * .4 + length); ctx.quadraticCurveTo(offset * r + r * .22, r * .8, offset * r + r * .15, r * .4); ctx.fill();
  }
  if (ufoArt.complete && ufoArt.naturalWidth) ctx.drawImage(ufoArt, -r * 1.5, -r * 1.05, r * 3, r * 1.85);
  ctx.restore();
}
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7); ctx.arc(x + r, y + r * 0.2, r * 0.8, 0, 7); ctx.arc(x - r, y + r * 0.2, r * 0.75, 0, 7); ctx.arc(x + r * 0.4, y - r * 0.5, r * 0.7, 0, 7);
  ctx.fill();
}
function pipe(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, top: boolean) {
  const body = ctx.createLinearGradient(x, 0, x + w, 0);
  body.addColorStop(0, '#F2A0B8'); body.addColorStop(0.5, '#EE7DA0'); body.addColorStop(1, '#D45E82');
  ctx.fillStyle = body; round(ctx, x, y, w, hh, 8); ctx.fill();
  // highlight dọc mảnh bên trái cho thân ống có khối (thay cho sọc chéo cũ hay tràn ra ngoài)
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  round(ctx, x + w * 0.16, y, Math.max(3, w * 0.12), hh, 4); ctx.fill();
  // nắp
  ctx.fillStyle = '#C94E74';
  const capH = Math.min(18, w * 0.4);
  round(ctx, x - 4, top ? y + hh - capH : y, w + 8, capH, 6); ctx.fill();
}
function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
