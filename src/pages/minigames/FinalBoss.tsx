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

const HP_MAX = 60;
const STEP = 1 / 120;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Mode = 'ready' | 'play' | 'dead' | 'won';
interface Bullet { x: number; y: number; xPrev: number; yPrev: number; vx: number; vy: number }
interface Shot { x: number; y: number; yPrev: number }
interface State {
  mode: Mode; w: number; h: number; t: number; acc: number;
  px: number; pxT: number; pxPrev: number;
  bx: number; bxPrev: number; bdir: number; by: number;
  hp: number; lives: number; phase: 1 | 2 | 3; hit: number; inv: number;
  bullets: Bullet[]; shots: Shot[]; fire: number; salvo: number; ring: number;
}

/** Ngày 21 — "Đại Chiến Boss Cuối": 3 pha. Di chuyển né đạn kẹo ✦, Gumi tự bắn 💧 lên hạ Boss. Càng ít máu Boss càng cuồng nộ. */
export function FinalBoss() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 21;
  const m = vi.missions[day - 1];
  const points = m?.points ?? 30;
  const act = actOfDay(day);

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<State>({ mode: 'ready', w: 1, h: 1, t: 0, acc: 0, px: 0.5, pxT: 0.5, pxPrev: 0.5, bx: 0.5, bxPrev: 0.5, bdir: 1, by: 0, hp: HP_MAX, lives: 3, phase: 1, hit: 0, inv: 0, bullets: [], shots: [], fire: 0, salvo: 0, ring: 0 });
  const [mode, setMode] = useState<Mode>('ready');
  const [hp, setHp] = useState(HP_MAX);
  const [lives, setLives] = useState(3);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [done, setDone] = useState(false);

  const to = (mo: Mode) => { g.current.mode = mo; setMode(mo); };
  const reset = useCallback(() => {
    const s = g.current;
    s.px = s.pxT = s.pxPrev = 0.5; s.bx = s.bxPrev = 0.5; s.bdir = 1;
    s.hp = HP_MAX; s.lives = 3; s.phase = 1; s.hit = 0; s.inv = 0; s.bullets = []; s.shots = []; s.fire = 0; s.salvo = 0; s.ring = 0; s.acc = 0;
    setHp(HP_MAX); setLives(3); setPhase(1); to('ready');
  }, []);
  const start = useCallback(() => { const s = g.current; if (s.mode === 'ready') to('play'); else if (s.mode === 'dead') reset(); }, [reset]);

  // Điều khiển: rê để di chuyển (né đạn). Chạm để bắt đầu/chơi lại. Phím ←/→ và Space.
  useEffect(() => {
    const box = boxRef.current; if (!box) return;
    const posFrom = (clientX: number) => { const r = box.getBoundingClientRect(); g.current.pxT = clamp((clientX - r.left) / r.width, 0.06, 0.94); };
    const move = (e: PointerEvent) => posFrom(e.clientX);
    const down = (e: PointerEvent) => { start(); posFrom(e.clientX); };
    const key = (e: KeyboardEvent) => {
      const s = g.current;
      if (e.code === 'Space') { e.preventDefault(); start(); }
      if (e.code === 'ArrowLeft') s.pxT = clamp(s.pxT - 0.09, 0.06, 0.94);
      if (e.code === 'ArrowRight') s.pxT = clamp(s.pxT + 0.09, 0.06, 0.94);
    };
    box.addEventListener('pointermove', move); box.addEventListener('pointerdown', down); window.addEventListener('keydown', key);
    return () => { box.removeEventListener('pointermove', move); box.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key); };
  }, [start]);

  useArcadeLoop(boxRef, canvasRef, (ctx, w, h, dt) => {
    const s = g.current; s.w = w; s.h = h; s.t += dt; if (s.hit > 0) s.hit -= dt; if (s.inv > 0) s.inv -= dt;
    const sc = h / 620;
    const pr = clamp(w * 0.045, 20, 34);            // bán kính Gumi
    const py = h * 0.86;
    s.by = Math.max(h * 0.2, clamp(w * 0.2, 70, 130) * 1.15);

    // pha theo % máu boss
    const pct = s.hp / HP_MAX;
    const ph: 1 | 2 | 3 = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (ph !== s.phase) { s.phase = ph; setPhase(ph); playSfx('boing'); }

    s.acc = Math.min(s.acc + dt, 0.1);
    while (s.mode === 'play' && s.acc >= STEP) {
      s.acc -= STEP;
      s.pxPrev = s.px; s.bxPrev = s.bx;
      for (const b of s.bullets) { b.xPrev = b.x; b.yPrev = b.y; }
      for (const sh of s.shots) sh.yPrev = sh.y;

      s.px += (s.pxT - s.px) * Math.min(1, STEP * 16);
      const pxAbs = s.px * w;

      // Boss lượn ngang, nhanh dần theo pha
      const bSpeed = (0.12 + s.phase * 0.06);
      s.bx += s.bdir * bSpeed * STEP;
      if (s.bx > 0.8) { s.bx = 0.8; s.bdir = -1; } if (s.bx < 0.2) { s.bx = 0.2; s.bdir = 1; }
      const bxAbs = s.bx * w;

      // Gumi TỰ BẮN 💧 lên
      s.fire -= STEP;
      const fireRate = 0.26;
      if (s.fire <= 0) { s.fire = fireRate; s.shots.push({ x: pxAbs, y: py - pr, yPrev: py - pr }); playSfx('sip'); }
      for (const sh of s.shots) sh.y -= 0.9 * h * STEP;
      // trúng boss
      const br = clamp(w * 0.2, 70, 130);
      s.shots = s.shots.filter((sh) => {
        if (sh.y < s.by + br * 0.7 && Math.abs(sh.x - bxAbs) < br * 0.85) { s.hp = Math.max(0, s.hp - 1); setHp(s.hp); s.hit = 0.12; if (s.hp <= 0) { winNow(s, day, setDone, to); } return false; }
        return sh.y > -20;
      });

      // Boss bắn đạn kẹo ✦ theo pha
      s.salvo -= STEP;
      const salvoEvery = s.phase === 1 ? 0.9 : s.phase === 2 ? 0.62 : 0.44;
      if (s.salvo <= 0) {
        s.salvo = salvoEvery;
        const spd = (120 + s.phase * 45) * sc;
        if (s.phase === 1) {
          // đạn nhắm thẳng người chơi
          aim(s.bullets, bxAbs, s.by, pxAbs, py, spd);
        } else if (s.phase === 2) {
          // 3 tia toả
          for (let a = -1; a <= 1; a++) s.bullets.push({ x: bxAbs, y: s.by, xPrev: bxAbs, yPrev: s.by, vx: a * 70 * sc, vy: spd });
          aim(s.bullets, bxAbs, s.by, pxAbs, py, spd);
        } else {
          // 5 tia toả rộng
          for (let a = -2; a <= 2; a++) s.bullets.push({ x: bxAbs, y: s.by, xPrev: bxAbs, yPrev: s.by, vx: a * 60 * sc, vy: spd * 0.95 });
        }
      }
      // Pha 3: bắn vòng tròn định kỳ
      if (s.phase === 3) {
        s.ring -= STEP;
        if (s.ring <= 0) {
          s.ring = 1.5;
          const spd = 150 * sc;
          for (let i = 0; i < 12; i++) { const ang = (i / 12) * Math.PI * 2; s.bullets.push({ x: bxAbs, y: s.by, xPrev: bxAbs, yPrev: s.by, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd }); }
          playSfx('wrong');
        }
      }

      for (const b of s.bullets) { b.x += b.vx * STEP; b.y += b.vy * STEP; }
      // va chạm với người chơi
      if (s.inv <= 0) {
        for (const b of s.bullets) {
          if (Math.hypot(b.x - pxAbs, b.y - py) < pr + 9) {
            s.lives -= 1; setLives(s.lives); s.inv = 1.2; playSfx('sleep');
            s.bullets = s.bullets.filter((x) => Math.hypot(x.x - pxAbs, x.y - py) > pr + 40); // dọn đạn quanh để không mất liên tiếp
            if (s.lives <= 0) { to('dead'); playSfx('wrong'); }
            break;
          }
        }
      }
      s.bullets = s.bullets.filter((b) => b.x > -30 && b.x < w + 30 && b.y > -30 && b.y < h + 30);
    }

    if (s.mode !== 'play') { s.pxPrev = s.px; s.bxPrev = s.bx; for (const b of s.bullets) { b.xPrev = b.x; b.yPrev = b.y; } for (const sh of s.shots) sh.yPrev = sh.y; }
    const alpha = s.mode === 'play' ? clamp(s.acc / STEP, 0, 1) : 1;
    draw(ctx, w, h, s, act, { pr, py, alpha });
  });

  if (done) return <MissionDone day={day} points={points} note="BOSS ĐƯỜNG bị đánh bại! Bạn tốt nghiệp Level Down 🎓" />;

  const hud = (
    <div className="flex shrink-0 items-center gap-2">
      <span className="rounded-pill bg-surface/90 px-2.5 py-1 text-caption font-bold text-primary shadow-soft backdrop-blur">Pha {phase}/3</span>
      <span className="flex items-center gap-1 rounded-pill bg-surface/90 px-3 py-1.5 shadow-soft backdrop-blur" aria-label={`Còn ${lives} mạng`}>
        {[0, 1, 2].map((i) => <Icon key={i} name="heart" size={15} filled={i < lives} className={i < lives ? 'text-primary' : 'text-border-strong/40'} />)}
      </span>
    </div>
  );

  return (
    <ArcadeStage act={act} title="Đại Chiến Boss Cuối" hint="Rê để né đạn kẹo ✦ · Gumi tự bắn 💧 hạ Boss" hud={hud} boxRef={boxRef} canvasRef={canvasRef}
      overlay={
        mode === 'ready' ? (
          <ArcadeOverlay>
            <p className="text-title font-extrabold text-white drop-shadow">Trận cuối! 👑😈</p>
            <p className="max-w-sm text-small font-medium text-white/90">Rê để <b>né đạn kẹo ✦</b>. Gumi <b>tự bắn nước lành 💧</b> lên — cứ đứng dưới Boss mà xả! Boss càng ít máu càng <b>cuồng nộ</b> (3 pha). Còn 3 mạng.</p>
            <button type="button" onClick={start} className="rounded-pill bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{vi.minigames.common.start}</button>
          </ArcadeOverlay>
        ) : mode === 'dead' ? (
          <ArcadeOverlay>
            <Banner kind="error">Gục mất rồi! Boss còn {hp}/{HP_MAX} độ ngọt.</Banner>
            <button type="button" onClick={start} className="rounded-pill bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{vi.minigames.common.retry}</button>
          </ArcadeOverlay>
        ) : null
      }
    />
  );
}

function aim(arr: Bullet[], x: number, y: number, tx: number, ty: number, spd: number) {
  const d = Math.hypot(tx - x, ty - y) || 1;
  arr.push({ x, y, xPrev: x, yPrev: y, vx: (tx - x) / d * spd, vy: (ty - y) / d * spd });
}
function winNow(s: State, day: number, setDone: (b: boolean) => void, to: (m: Mode) => void) {
  s.mode = 'won'; to('won'); playSfx('win'); api.submitMinigame(day).catch(() => {}); setTimeout(() => setDone(true), 900);
}

/* ---- Vẽ ---- */
const SKY: Record<1 | 2 | 3, [string, string]> = { 1: ['#FBE3D2', '#F6D6C4'], 2: ['#D9C6EC', '#E7DAF2'], 3: ['#3A2E5E', '#5A4A86'] };
function draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: State, act: 1 | 2 | 3, d: { pr: number; py: number; alpha: number }) {
  const a = d.alpha;
  const [c0, c1] = SKY[s.phase === 3 ? 3 : act];
  const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, c0); bg.addColorStop(1, c1);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // BOSS
  const bxAbs = lerp(s.bxPrev, s.bx, a) * w;
  const br = clamp(w * 0.2, 70, 130), by = s.by;
  const wob = Math.sin(s.t * (2 + s.phase)) * br * 0.05;
  ctx.fillStyle = s.hit > 0 ? '#F6B6CF' : s.phase === 3 ? '#D26FA0' : '#E98FB4';
  blob(ctx, bxAbs, by, br + wob, br * 0.8);
  // vương miện pha
  ctx.fillStyle = '#F2C94C'; ctx.beginPath();
  ctx.moveTo(bxAbs - br * 0.5, by - br * 0.7); ctx.lineTo(bxAbs - br * 0.5, by - br * 1.1); ctx.lineTo(bxAbs - br * 0.2, by - br * 0.85); ctx.lineTo(bxAbs, by - br * 1.2); ctx.lineTo(bxAbs + br * 0.2, by - br * 0.85); ctx.lineTo(bxAbs + br * 0.5, by - br * 1.1); ctx.lineTo(bxAbs + br * 0.5, by - br * 0.7); ctx.closePath(); ctx.fill();
  // mắt (dữ hơn theo pha)
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bxAbs - br * 0.34, by, br * 0.17, 0, 7); ctx.arc(bxAbs + br * 0.34, by, br * 0.17, 0, 7); ctx.fill();
  ctx.fillStyle = '#3A2320'; ctx.beginPath(); ctx.arc(bxAbs - br * 0.34, by + 2, br * 0.08, 0, 7); ctx.arc(bxAbs + br * 0.34, by + 2, br * 0.08, 0, 7); ctx.fill();
  ctx.strokeStyle = '#3A2320'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bxAbs, by + br * 0.5, br * 0.22, Math.PI, 0); ctx.stroke(); // cau có
  // thanh HP boss
  const barW = br * 2, bxL = bxAbs - br, byY = Math.max(6, by - br * 1.35);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; round(ctx, bxL, byY, barW, 12, 6); ctx.fill();
  ctx.fillStyle = s.phase === 3 ? '#E0563F' : '#5AC46E'; round(ctx, bxL, byY, barW * (s.hp / HP_MAX), 12, 6); ctx.fill();

  // đạn 💧 của Gumi
  for (const sh of s.shots) {
    const y = lerp(sh.yPrev, sh.y, a);
    ctx.fillStyle = '#5FA8E8';
    ctx.beginPath(); ctx.moveTo(sh.x, y - 10); ctx.bezierCurveTo(sh.x + 7, y, sh.x + 5, y + 9, sh.x, y + 9); ctx.bezierCurveTo(sh.x - 5, y + 9, sh.x - 7, y, sh.x, y - 10); ctx.fill();
  }
  // đạn kẹo ✦ của Boss
  for (const b of s.bullets) {
    const x = lerp(b.xPrev, b.x, a), y = lerp(b.yPrev, b.y, a);
    ctx.fillStyle = '#F2F2F2'; round(ctx, x - 9, y - 9, 18, 18, 4); ctx.fill();
    ctx.strokeStyle = '#E0567F'; ctx.lineWidth = 2.4; round(ctx, x - 9, y - 9, 18, 18, 4); ctx.stroke();
    ctx.fillStyle = '#F19AB0'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill();
  }

  // GUMI người chơi (nội suy x)
  const px = lerp(s.pxPrev, s.px, a) * w, py = d.py, r = d.pr;
  const blink = s.inv > 0 && Math.floor(s.t * 20) % 2 === 0;
  ctx.save(); ctx.globalAlpha = blink ? 0.4 : 1;
  ctx.fillStyle = '#E3A57C';
  ctx.beginPath(); ctx.moveTo(px - r * 0.5, py - r * 0.7); ctx.lineTo(px - r * 0.85, py - r * 1.6); ctx.lineTo(px - r * 0.05, py - r * 0.95); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(px + r * 0.5, py - r * 0.7); ctx.lineTo(px + r * 0.85, py - r * 1.6); ctx.lineTo(px + r * 0.05, py - r * 0.95); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#FBEFE4'; ctx.beginPath(); ctx.ellipse(px, py + r * 0.25, r * 0.6, r * 0.68, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2A2320'; ctx.beginPath(); ctx.arc(px - r * 0.28, py - r * 0.1, r * 0.13, 0, 7); ctx.arc(px + r * 0.28, py - r * 0.1, r * 0.13, 0, 7); ctx.fill();
  ctx.restore();
}
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - rx * 0.5, y + ry * 0.5, rx * 0.4, ry * 0.4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + rx * 0.5, y + ry * 0.5, rx * 0.4, ry * 0.4, 0, 0, 7); ctx.fill();
}
function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
