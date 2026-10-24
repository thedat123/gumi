import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { ArcadeOverlay, ArcadeStage } from '../../components/ArcadeStage';
import { Banner } from '../../components/Banner';
import { Icon } from '../../components/Icon';
import { MissionDone } from '../../components/MissionDone';
import { actOfDay } from '../../lib/scoring';
import { playSfx } from '../../lib/sfx';
import { useArcadeLoop } from '../../lib/useArcadeLoop';
import { vi } from '../../content/vi';

const TARGET = 40; // vượt 40 chướng ngại/mốc → cán đích, hạ Boss Hồi 2
const STEP = 1 / 120;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Mode = 'ready' | 'play' | 'dead' | 'won';
interface Obs { x: number; xPrev: number; kind: 'low' | 'high'; k: number; scored: boolean }
interface Item { x: number; xPrev: number; y: number; k: number }
interface State {
  mode: Mode; w: number; h: number; t: number; acc: number;
  py: number; pyPrev: number; vy: number; onGround: boolean; slide: number; run: number;
  obs: Obs[]; items: Item[]; score: number; lives: number; dist: number; spawn: number; iSpawn: number; inv: number;
}

/** Ngày 14 — "Chạy Trốn Cơn Thèm": endless runner. Vuốt LÊN để nhảy 🍰, vuốt XUỐNG để trượt né 🧊 trên cao, nhặt 💧 lấy điểm. */
export function SugarRun() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 14;
  const m = vi.missions[day - 1];
  const points = m?.points ?? 30;
  const act = actOfDay(day);

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<State>({ mode: 'ready', w: 1, h: 1, t: 0, acc: 0, py: 0, pyPrev: 0, vy: 0, onGround: true, slide: 0, run: 0, obs: [], items: [], score: 0, lives: 3, dist: 0, spawn: 0, iSpawn: 0, inv: 0 });
  const [mode, setMode] = useState<Mode>('ready');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [done, setDone] = useState(false);

  const to = (mo: Mode) => { g.current.mode = mo; setMode(mo); };

  const restY = () => g.current.h * 0.82;
  const reset = useCallback(() => {
    const s = g.current;
    s.py = restY(); s.pyPrev = s.py; s.vy = 0; s.onGround = true; s.slide = 0;
    s.obs = []; s.items = []; s.score = 0; s.lives = 3; s.dist = 0; s.spawn = 0; s.iSpawn = 0; s.inv = 0;
    setScore(0); setLives(3); to('ready');
  }, []);

  const jump = useCallback(() => {
    const s = g.current;
    if (s.mode === 'dead') { reset(); return; }
    if (s.mode === 'won') return;
    if (s.mode === 'ready') to('play');
    if (s.onGround) { s.vy = -1.15 * s.h; s.onGround = false; s.slide = 0; playSfx('boing'); }
  }, [reset]);
  const slide = useCallback(() => {
    const s = g.current;
    if (s.mode === 'ready') to('play');
    if (s.mode !== 'play') return;
    if (!s.onGround) { s.vy = 0.9 * s.h; }   // đang trên không → chúi xuống nhanh
    s.slide = 0.5; playSfx('pop');
  }, []);

  // Điều khiển: vuốt lên = nhảy, vuốt xuống = trượt (chạm nhanh = nhảy). Phím ↑/Space nhảy, ↓ trượt.
  useEffect(() => {
    const box = boxRef.current; if (!box) return;
    let sy = 0, st = 0, moved = false;
    const down = (e: PointerEvent) => { sy = e.clientY; st = performance.now(); moved = false; };
    const move = (e: PointerEvent) => {
      if (moved) return;
      const dy = e.clientY - sy;
      if (dy < -26) { moved = true; jump(); }
      else if (dy > 26) { moved = true; slide(); }
    };
    const up = (e: PointerEvent) => { if (!moved && performance.now() - st < 300 && Math.abs(e.clientY - sy) < 26) jump(); };
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      if (e.code === 'ArrowDown') { e.preventDefault(); slide(); }
    };
    box.addEventListener('pointerdown', down); box.addEventListener('pointermove', move); box.addEventListener('pointerup', up);
    window.addEventListener('keydown', key);
    return () => { box.removeEventListener('pointerdown', down); box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', up); window.removeEventListener('keydown', key); };
  }, [jump, slide]);

  useArcadeLoop(boxRef, canvasRef, (ctx, w, h, dt) => {
    const s = g.current;
    if (s.w !== w || s.h !== h) { s.w = w; s.h = h; if (s.mode === 'ready') { s.py = restY(); s.pyPrev = s.py; } }
    s.t += dt;
    if (s.inv > 0) s.inv -= dt;

    const ground = restY();
    const runnerX = w * 0.26;
    const speed = (245 + Math.min(140, s.dist * 0.06)) * (h / 620); // nhanh dần cho căng
    const bodyR = clamp(h * 0.05, 20, 36);

    s.acc = Math.min(s.acc + dt, 0.1);
    while (s.mode === 'play' && s.acc >= STEP) {
      s.acc -= STEP;
      s.pyPrev = s.py;
      for (const o of s.obs) o.xPrev = o.x;
      for (const it of s.items) it.xPrev = it.x;

      if (s.slide > 0) s.slide -= STEP;
      s.vy += 4.6 * h * STEP;                 // trọng lực mạnh → nhảy dứt khoát
      s.py += s.vy * STEP;
      if (s.py >= ground) { s.py = ground; s.vy = 0; s.onGround = true; }
      s.dist += speed * STEP * 0.06;

      // Sinh chướng ngại: xen kẽ thấp (nhảy) / cao (trượt)
      s.spawn -= speed * STEP;
      if (s.spawn <= 0) {
        const gapMin = clamp(w * 0.42, 190, 340);
        s.spawn = gapMin + Math.random() * w * 0.28;
        const high = Math.random() < 0.4;
        s.obs.push({ x: w + 40, xPrev: w + 40, kind: high ? 'high' : 'low', k: Math.floor(Math.random() * 3), scored: false });
      }
      // Sinh vật phẩm nước lành 💧 (nhặt +2)
      s.iSpawn -= speed * STEP;
      if (s.iSpawn <= 0) {
        s.iSpawn = clamp(w * 0.6, 260, 460) + Math.random() * w * 0.4;
        const y = ground - bodyR - (Math.random() < 0.5 ? bodyR * 0.4 : h * 0.22);
        s.items.push({ x: w + 30, xPrev: w + 30, y, k: Math.floor(Math.random() * 2) });
      }

      for (const o of s.obs) o.x -= speed * STEP;
      for (const it of s.items) it.x -= speed * STEP;

      // Hitbox người chơi (trượt → thấp & lùn)
      const sliding = s.slide > 0 && s.onGround;
      const headTop = s.py - (sliding ? bodyR * 0.5 : bodyR * 1.7);
      const feet = s.py;
      const pl = runnerX - bodyR * 0.6, pr = runnerX + bodyR * 0.6;

      for (const o of s.obs) {
        const ow = bodyR * 1.3;
        const ol = o.x - ow / 2, or = o.x + ow / 2;
        // low: khối trên mặt đất (cao ~1.3R) → phải NHẢY. high: treo trên cao → phải TRƯỢT.
        const oTop = o.kind === 'low' ? ground - bodyR * 1.5 : ground - bodyR * 3.4;
        const oBot = o.kind === 'low' ? ground : ground - bodyR * 1.9;
        const hit = pr > ol && pl < or && feet > oTop && headTop < oBot;
        if (hit && s.inv <= 0) { s.lives -= 1; setLives(s.lives); s.inv = 1.1; playSfx('sleep'); if (s.lives <= 0) { to('dead'); playSfx('wrong'); } }
        if (!o.scored && o.x + ow / 2 < pl) { o.scored = true; s.score = Math.min(TARGET, s.score + 1); setScore(s.score); if (s.score >= TARGET) win(s, day, setDone, to); }
      }
      s.obs = s.obs.filter((o) => o.x > -60);

      for (const it of s.items) {
        const d = Math.hypot(it.x - runnerX, it.y - (s.py - bodyR * 0.8));
        if (d < bodyR * 1.2) { it.x = -999; s.score = Math.min(TARGET, s.score + 2); setScore(s.score); playSfx('sparkle'); if (s.score >= TARGET) win(s, day, setDone, to); }
      }
      s.items = s.items.filter((it) => it.x > -40);
    }

    if (s.mode !== 'play') { s.pyPrev = s.py; for (const o of s.obs) o.xPrev = o.x; for (const it of s.items) it.xPrev = it.x; }
    if (s.mode === 'play' || s.mode === 'won') s.run += dt * 14; // nhịp chân
    const alpha = s.mode === 'play' ? clamp(s.acc / STEP, 0, 1) : 1;

    draw(ctx, w, h, s, act, { ground, runnerX, bodyR, alpha });
  });

  if (done) return <MissionDone day={day} points={points} note={`Bạn băng qua cơn thèm với ${TARGET} mốc — Boss Hồi 2 tan chảy!`} />;

  const hud = (
    <div className="flex shrink-0 items-center gap-2">
      <span className="flex items-center gap-1 rounded-pill bg-surface/90 px-3 py-1.5 shadow-soft backdrop-blur" aria-label={`Còn ${lives} mạng`}>
        {[0, 1, 2].map((i) => <Icon key={i} name="heart" size={15} filled={i < lives} className={i < lives ? 'text-primary' : 'text-border-strong/40'} />)}
      </span>
      <span className="flex items-center gap-1 rounded-pill bg-surface/90 px-3 py-1.5 text-small font-extrabold text-primary shadow-soft backdrop-blur">
        {score}<span className="text-caption font-semibold text-muted">/ {TARGET}</span>
      </span>
    </div>
  );

  return (
    <ArcadeStage act={act} title="Chạy Trốn Cơn Thèm" hint="Vuốt LÊN nhảy 🍰 · vuốt XUỐNG trượt né 🧊 · nhặt 💧" hud={hud} boxRef={boxRef} canvasRef={canvasRef} onPointerDown={undefined}
      overlay={
        mode === 'ready' ? (
          <ArcadeOverlay>
            <p className="text-title font-extrabold text-white drop-shadow">Chạy trốn cơn thèm! 🐱</p>
            <p className="max-w-sm text-small font-medium text-white/90">Vuốt <b>lên</b> để nhảy qua bánh kẹo, vuốt <b>xuống</b> để trượt né chướng ngại trên cao. Nhặt <b>nước lành 💧</b> +2 điểm. Về đích {TARGET} mốc, còn 3 mạng.</p>
            <button type="button" onClick={jump} className="rounded-pill border border-black/15 bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{vi.minigames.common.start}</button>
          </ArcadeOverlay>
        ) : mode === 'dead' ? (
          <ArcadeOverlay>
            <Banner kind="error">Ngã rồi! Bạn qua {score}/{TARGET} mốc.</Banner>
            <button type="button" onClick={jump} className="rounded-pill border border-black/15 bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{vi.minigames.common.retry}</button>
          </ArcadeOverlay>
        ) : null
      }
    />
  );
}

function win(s: State, day: number, setDone: (b: boolean) => void, to: (m: Mode) => void) {
  s.mode = 'won'; to('won'); playSfx('win'); api.submitMinigame(day).catch(() => {}); setTimeout(() => setDone(true), 800);
}

/* ---- Vẽ ---- */
const SKY: Record<1 | 2 | 3, [string, string]> = { 1: ['#BFE9FB', '#F6E8DC'], 2: ['#CDE7C6', '#EFE2C4'], 3: ['#CFE6FA', '#EAF2FB'] };
function draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: State, act: 1 | 2 | 3, d: { ground: number; runnerX: number; bodyR: number; alpha: number }) {
  const a = d.alpha;
  const [c0, c1] = SKY[act];
  const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, c0); sky.addColorStop(1, c1);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

  // đồi nền cuộn chậm (parallax)
  ctx.fillStyle = act === 2 ? 'rgba(150,200,150,0.5)' : 'rgba(180,210,235,0.5)';
  for (let i = 0; i < 3; i++) { const hx = ((-s.dist * 0.6 + i * w * 0.5) % (w + 300)) - 150; hill(ctx, hx, d.ground, w * 0.4, h * 0.18); }
  // mây
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 3; i++) { const cx = (((-s.dist * 0.9) + i * w * 0.42) % (w + 200)) - 90, cy = h * (0.12 + i * 0.1); cloud(ctx, cx, cy, 24 + i * 6); }

  // đất
  const gh = h - d.ground;
  ctx.fillStyle = act === 2 ? '#B98A5E' : act === 3 ? '#C9B79E' : '#E4C08C';
  ctx.fillRect(0, d.ground, w, gh);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let x = ((-s.dist * 6) % 44 + 44) % 44; x < w; x += 44) ctx.fillRect(x, d.ground, 22, 5);

  // vật phẩm nước lành
  for (const it of s.items) {
    const x = lerp(it.xPrev, it.x, a);
    ctx.fillStyle = it.k === 0 ? '#5FA8E8' : '#6FB6A0';
    ctx.beginPath(); ctx.moveTo(x, it.y - 12); ctx.bezierCurveTo(x + 10, it.y, x + 7, it.y + 11, x, it.y + 11); ctx.bezierCurveTo(x - 7, it.y + 11, x - 10, it.y, x, it.y - 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x - 3, it.y, 2.4, 0, 7); ctx.fill();
  }

  // chướng ngại
  for (const o of s.obs) {
    const x = lerp(o.xPrev, o.x, a);
    const ow = d.bodyR * 1.3;
    if (o.kind === 'low') {
      const oy = d.ground - d.bodyR * 1.5;
      sweet(ctx, x, oy, ow, d.bodyR * 1.5, o.k);
    } else {
      // treo trên cao (đèn/biển kẹo) — phải trượt qua
      const top = d.ground - d.bodyR * 3.4, hh = d.bodyR * 1.5;
      ctx.fillStyle = '#C06A8A'; round(ctx, x - ow / 2, top, ow, hh, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; round(ctx, x - ow / 2 + 4, top + 4, ow - 8, hh * 0.3, 4); ctx.fill();
      ctx.strokeStyle = '#9A5470'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - d.bodyR); ctx.stroke();
    }
  }

  // GUMI chạy (nội suy y + nhịp chân)
  const py = lerp(s.pyPrev, s.py, a);
  const sliding = s.slide > 0 && s.onGround;
  runner(ctx, d.runnerX, py, d.bodyR, s.run, sliding, s.inv > 0 && Math.floor(s.t * 20) % 2 === 0);
}
function runner(ctx: CanvasRenderingContext2D, x: number, feetY: number, r: number, run: number, sliding: boolean, blink: boolean) {
  ctx.save();
  ctx.globalAlpha = blink ? 0.4 : 1;
  const bob = sliding ? 0 : Math.abs(Math.sin(run)) * r * 0.1;
  const cy = feetY - (sliding ? r * 0.55 : r * 0.95) - bob;
  const bodyRy = sliding ? r * 0.55 : r * 0.9;
  const bodyRx = sliding ? r * 1.15 : r * 0.85;
  // chân chạy
  if (!sliding) {
    ctx.strokeStyle = '#C97C4E'; ctx.lineWidth = r * 0.26; ctx.lineCap = 'round';
    const ph = Math.sin(run), ph2 = Math.sin(run + Math.PI);
    ctx.beginPath(); ctx.moveTo(x - r * 0.2, cy + bodyRy * 0.5); ctx.lineTo(x - r * 0.2 + ph * r * 0.4, feetY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.2, cy + bodyRy * 0.5); ctx.lineTo(x + r * 0.2 + ph2 * r * 0.4, feetY); ctx.stroke();
  }
  // tai
  ctx.fillStyle = '#E3A57C';
  ctx.beginPath(); ctx.moveTo(x - r * 0.5, cy - bodyRy * 0.7); ctx.lineTo(x - r * 0.85, cy - bodyRy * 1.5); ctx.lineTo(x - r * 0.05, cy - bodyRy * 0.95); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + r * 0.5, cy - bodyRy * 0.7); ctx.lineTo(x + r * 0.85, cy - bodyRy * 1.5); ctx.lineTo(x + r * 0.05, cy - bodyRy * 0.95); ctx.closePath(); ctx.fill();
  // thân
  ctx.beginPath(); ctx.ellipse(x, cy, bodyRx, bodyRy, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#FBEFE4'; ctx.beginPath(); ctx.ellipse(x + r * 0.1, cy + bodyRy * 0.25, bodyRx * 0.6, bodyRy * 0.6, 0, 0, 7); ctx.fill();
  // mặt hướng chạy (phải)
  ctx.fillStyle = '#2A2320'; ctx.beginPath(); ctx.arc(x + bodyRx * 0.45, cy - bodyRy * 0.1, r * 0.14, 0, 7); ctx.fill();
  ctx.fillStyle = '#F2A93C'; ctx.beginPath(); ctx.moveTo(x + bodyRx * 0.75, cy); ctx.lineTo(x + bodyRx * 1.15, cy + r * 0.14); ctx.lineTo(x + bodyRx * 0.75, cy + r * 0.28); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function sweet(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hh: number, k: number) {
  // 0 = bánh, 1 = donut, 2 = kẹo
  if (k === 0) {
    ctx.fillStyle = '#E7C08C'; round(ctx, x - w / 2, y + hh * 0.4, w, hh * 0.6, 4); ctx.fill();
    ctx.fillStyle = '#F6D9E4'; round(ctx, x - w / 2, y, w, hh * 0.5, 5); ctx.fill();
    ctx.fillStyle = '#E0567F'; ctx.beginPath(); ctx.arc(x, y - 2, 3.4, 0, 7); ctx.fill();
  } else if (k === 1) {
    ctx.fillStyle = '#C98A5A'; ctx.beginPath(); ctx.arc(x, y + hh * 0.5, w * 0.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#F6C9DE'; ctx.beginPath(); ctx.arc(x, y + hh * 0.4, w * 0.42, 0, 7); ctx.fill();
    ctx.fillStyle = '#FBEFE4'; ctx.beginPath(); ctx.arc(x, y + hh * 0.5, w * 0.16, 0, 7); ctx.fill();
    for (const [dx, dy, c] of [[-0.2, -0.05, '#E0567F'], [0.18, 0.1, '#5FA8E8'], [0.05, -0.18, '#5AC46E']] as const) { ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x + dx * w, y + hh * 0.3 + dy * hh); ctx.lineTo(x + dx * w + 5, y + hh * 0.3 + dy * hh + 5); ctx.stroke(); }
  } else {
    ctx.fillStyle = '#F19AB0'; round(ctx, x - w / 2, y + hh * 0.2, w, hh * 0.7, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2, y + hh * 0.3 + i * hh * 0.2); ctx.lineTo(x + w / 2, y + hh * 0.2 + i * hh * 0.2); ctx.stroke(); }
  }
}
function hill(ctx: CanvasRenderingContext2D, x: number, ground: number, w: number, h: number) {
  ctx.beginPath(); ctx.ellipse(x + w / 2, ground, w / 2, h, 0, Math.PI, 0); ctx.fill();
}
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7); ctx.arc(x + r, y + r * 0.2, r * 0.8, 0, 7); ctx.arc(x - r, y + r * 0.2, r * 0.75, 0, 7); ctx.arc(x + r * 0.4, y - r * 0.5, r * 0.7, 0, 7);
  ctx.fill();
}
function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
