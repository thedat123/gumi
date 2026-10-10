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

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Cấu hình boss theo ngày (khó tăng dần: HP nhiều hơn, rơi nhanh hơn, nhiều đường xấu hơn). */
const CFG: Record<number, { title: string; hp: number; every: number; bad: number; fall: number; burst: number; win: string }> = {
  14: { title: 'Đánh Bại Boss Đường', hp: 16, every: 0.62, bad: 0.34, fall: 190, burst: 0, win: 'Boss Hồi 2 tan chảy! Bạn đã pha loãng cơn nghiện ngọt.' },
  21: { title: 'Đại Chiến Boss Cuối', hp: 26, every: 0.5, bad: 0.44, fall: 235, burst: 3.4, win: 'BOSS ĐƯỜNG bị đánh bại! Bạn tốt nghiệp Level Down 🎓' },
};

type Mode = 'ready' | 'play' | 'dead' | 'won';
interface Drop { x: number; y: number; vy: number; good: boolean; k: number; sway: number }
interface State { mode: Mode; px: number; pxT: number; drops: Drop[]; hp: number; lives: number; w: number; h: number; t: number; spawn: number; burst: number; hit: number }

/** Ngày 14 & 21 — Boss cuối Hồi: hứng NƯỚC LÀNH (💧🍵) để hạ độ ngọt của Boss, NÉ đường xấu (🧊🥤🍬). 3 mạng. */
export function BossBattle() {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 14;
  const cfg = CFG[day] ?? CFG[14]!;
  const m = vi.missions[day - 1];
  const points = m?.points ?? 30;
  const act = actOfDay(day);

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef<State>({ mode: 'ready', px: 0.5, pxT: 0.5, drops: [], hp: cfg.hp, lives: 3, w: 1, h: 1, t: 0, spawn: 0, burst: 0, hit: 0 });
  const [mode, setMode] = useState<Mode>('ready');
  const [hp, setHp] = useState(cfg.hp);
  const [lives, setLives] = useState(3);
  const [done, setDone] = useState(false);

  const to = (mo: Mode) => { g.current.mode = mo; setMode(mo); };
  const reset = useCallback(() => {
    const s = g.current; s.drops = []; s.hp = cfg.hp; s.lives = 3; s.spawn = 0; s.burst = 0; s.px = s.pxT = 0.5;
    setHp(cfg.hp); setLives(3); to('ready');
  }, [cfg.hp]);
  const start = useCallback(() => { if (g.current.mode === 'ready') to('play'); }, []);

  // Điều khiển: rê ngón/chuột để di chuyển, chạm để bắt đầu/chơi lại; phím ←/→ và Space.
  useEffect(() => {
    const box = boxRef.current; if (!box) return;
    const posFrom = (clientX: number) => { const r = box.getBoundingClientRect(); g.current.pxT = clamp((clientX - r.left) / r.width, 0.05, 0.95); };
    const move = (e: PointerEvent) => posFrom(e.clientX);
    const down = (e: PointerEvent) => { const s = g.current; if (s.mode === 'ready') start(); else if (s.mode === 'dead') reset(); posFrom(e.clientX); };
    const key = (e: KeyboardEvent) => {
      const s = g.current;
      if (e.code === 'Space') { e.preventDefault(); if (s.mode === 'ready') start(); else if (s.mode === 'dead') reset(); }
      if (e.code === 'ArrowLeft') s.pxT = clamp(s.pxT - 0.08, 0.05, 0.95);
      if (e.code === 'ArrowRight') s.pxT = clamp(s.pxT + 0.08, 0.05, 0.95);
    };
    box.addEventListener('pointermove', move); box.addEventListener('pointerdown', down); window.addEventListener('keydown', key);
    return () => { box.removeEventListener('pointermove', move); box.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key); };
  }, [reset, start]);

  useArcadeLoop(boxRef, canvasRef, (ctx, w, h, dt) => {
    const s = g.current; s.w = w; s.h = h; s.t += dt; if (s.hit > 0) s.hit -= dt;
    const sc = h / 620;
    const pw = clamp(w * 0.17, 74, 140), py = h * 0.85, catchR = pw * 0.5;

    s.px += (s.pxT - s.px) * Math.min(1, dt * 12);
    const pxAbs = s.px * w;

    if (s.mode === 'play') {
      const prog = 1 - s.hp / cfg.hp;
      s.spawn += dt;
      if (s.spawn >= cfg.every) {
        s.spawn = 0;
        const good = Math.random() > cfg.bad;
        s.drops.push({ x: 0.08 * w + Math.random() * 0.84 * w, y: -20, vy: (cfg.fall + prog * 90) * sc, good, k: Math.floor(Math.random() * 3), sway: Math.random() * 6.28 });
      }
      if (cfg.burst > 0) { s.burst += dt; if (s.burst >= cfg.burst) { s.burst = 0; const cx = 0.2 * w + Math.random() * 0.6 * w; for (let i = -1; i <= 1; i++) s.drops.push({ x: cx + i * w * 0.12, y: -20, vy: (cfg.fall + 60) * sc, good: false, k: 1, sway: 0 }); } }

      for (const d of s.drops) { d.y += d.vy * dt; d.x += Math.sin(s.t * 2 + d.sway) * 12 * dt; }
      // Bắt / trượt
      s.drops = s.drops.filter((d) => {
        if (d.y >= py - catchR * 0.5 && d.y <= py + catchR && Math.abs(d.x - pxAbs) < catchR) {
          if (d.good) { s.hp = Math.max(0, s.hp - 1); setHp(s.hp); s.hit = 0.18; playSfx('sip'); if (s.hp <= 0) { to('won'); playSfx('win'); api.submitMinigame(day).catch(() => {}); setTimeout(() => setDone(true), 800); } }
          else { s.lives = Math.max(0, s.lives - 1); setLives(s.lives); playSfx('sleep'); if (s.lives <= 0) { to('dead'); } }
          return false;
        }
        return d.y < h + 40;
      });
    }
    draw(ctx, w, h, s, act, cfg.hp, { pw, py, pxAbs });
  });

  if (done) return <MissionDone day={day} points={points} note={cfg.win} />;

  const hud = (
    <span className="flex shrink-0 items-center gap-1 rounded-pill bg-surface/90 px-3 py-1.5 shadow-soft backdrop-blur" aria-label={`Còn ${lives} mạng`}>
      {[0, 1, 2].map((i) => <Icon key={i} name="heart" size={16} filled={i < lives} className={i < lives ? 'text-primary' : 'text-border-strong/40'} />)}
    </span>
  );

  return (
    <ArcadeStage act={act} title={cfg.title} hint="Rê để hứng 💧 nước lành · né 🧊 đường xấu" hud={hud} boxRef={boxRef} canvasRef={canvasRef}
      overlay={
        mode === 'ready' ? (
          <ArcadeOverlay>
            <p className="text-title font-extrabold text-white drop-shadow">Hạ gục Boss Đường!</p>
            <p className="max-w-sm text-small font-medium text-white/90">Rê nhân vật để hứng <b>nước lành 💧🍵</b> làm tan độ ngọt của Boss. Né <b>đường xấu 🧊🥤🍬</b> — dính là mất mạng. Còn 3 mạng.</p>
            <button type="button" onClick={start} className="rounded-pill border border-black/15 bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{vi.minigames.common.start}</button>
          </ArcadeOverlay>
        ) : mode === 'dead' ? (
          <ArcadeOverlay>
            <Banner kind="error">Hết mạng rồi! Boss còn {hp} độ ngọt.</Banner>
            <button type="button" onClick={reset} className="rounded-pill border border-black/15 bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{vi.minigames.common.retry}</button>
          </ArcadeOverlay>
        ) : null
      }
    />
  );
}

/* ---- Vẽ ---- */
const SKY: Record<1 | 2 | 3, [string, string]> = { 1: ['#FBE3D2', '#F6D6C4'], 2: ['#CDE7C6', '#E7F0DC'], 3: ['#CFE6FA', '#E6EEF9'] };
function draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: State, act: 1 | 2 | 3, hpMax: number, d: { pw: number; py: number; pxAbs: number }) {
  const [c0, c1] = SKY[act];
  const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, c0); bg.addColorStop(1, c1);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // BOSS ĐƯỜNG ở trên
  const bx = w / 2, br = clamp(w * 0.2, 70, 140), by = Math.max(h * 0.2, br * 1.15);
  const wob = Math.sin(s.t * 2) * br * 0.05;
  ctx.fillStyle = s.hit > 0 ? '#F4A6C0' : '#E98FB4';
  blob(ctx, bx, by, br + wob, br * 0.8);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(bx - br * 0.34, by, br * 0.17, 0, 7); ctx.arc(bx + br * 0.34, by, br * 0.17, 0, 7); ctx.fill();
  ctx.fillStyle = '#3A2320';
  ctx.beginPath(); ctx.arc(bx - br * 0.34, by + 2, br * 0.08, 0, 7); ctx.arc(bx + br * 0.34, by + 2, br * 0.08, 0, 7); ctx.fill();
  ctx.strokeStyle = '#3A2320'; ctx.lineWidth = 4; ctx.beginPath();
  if (s.hp <= hpMax * 0.4) ctx.arc(bx, by + br * 0.45, br * 0.2, Math.PI, 0); else ctx.arc(bx, by + br * 0.5, br * 0.22, 0, Math.PI);
  ctx.stroke();
  // thanh HP boss
  const barW = br * 2, bxL = bx - br, byY = Math.max(6, by - br * 1.05);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; round(ctx, bxL, byY, barW, 12, 6); ctx.fill();
  ctx.fillStyle = '#5AC46E'; round(ctx, bxL, byY, barW * (s.hp / hpMax), 12, 6); ctx.fill();

  // giọt rơi
  for (const dr of s.drops) {
    if (dr.good) { // nước lành
      ctx.fillStyle = dr.k === 0 ? '#5FA8E8' : '#6FB6A0';
      ctx.beginPath(); ctx.moveTo(dr.x, dr.y - 13); ctx.bezierCurveTo(dr.x + 11, dr.y, dr.x + 8, dr.y + 12, dr.x, dr.y + 12); ctx.bezierCurveTo(dr.x - 8, dr.y + 12, dr.x - 11, dr.y, dr.x, dr.y - 13); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(dr.x - 3, dr.y + 1, 2.5, 0, 7); ctx.fill();
    } else { // đường xấu (khối/kẹo)
      ctx.fillStyle = dr.k === 0 ? '#EAD8B0' : dr.k === 1 ? '#F2F2F2' : '#F19AB0';
      round(ctx, dr.x - 11, dr.y - 11, 22, 22, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; round(ctx, dr.x - 11, dr.y - 11, 22, 22, 5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; round(ctx, dr.x - 7, dr.y - 7, 6, 6, 2); ctx.fill();
    }
  }

  // đất
  ctx.fillStyle = act === 2 ? '#B98A5E' : act === 3 ? '#C9B79E' : '#E4C08C';
  ctx.fillRect(0, h - h * 0.045, w, h * 0.045);

  // NGƯỜI CHƠI: bát hứng + Gumi
  const px = d.pxAbs, py = d.py, pw = d.pw;
  ctx.fillStyle = '#E3A57C';
  ctx.beginPath(); ctx.moveTo(px - pw * 0.2, py - 20); ctx.lineTo(px - pw * 0.28, py - 36); ctx.lineTo(px - pw * 0.06, py - 22); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(px + pw * 0.2, py - 20); ctx.lineTo(px + pw * 0.28, py - 36); ctx.lineTo(px + pw * 0.06, py - 22); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(px, py - 8, pw * 0.24, 0, 7); ctx.fill();
  ctx.fillStyle = '#2A2320'; ctx.beginPath(); ctx.arc(px - pw * 0.08, py - 10, 2.6, 0, 7); ctx.arc(px + pw * 0.08, py - 10, 2.6, 0, 7); ctx.fill();
  // bát
  const bowl = ctx.createLinearGradient(0, py, 0, py + 24); bowl.addColorStop(0, '#FFF3D6'); bowl.addColorStop(1, '#E7B36A');
  ctx.fillStyle = bowl;
  ctx.beginPath(); ctx.moveTo(px - pw / 2, py); ctx.lineTo(px + pw / 2, py); ctx.lineTo(px + pw * 0.36, py + 26); ctx.lineTo(px - pw * 0.36, py + 26); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#D89A4E'; round(ctx, px - pw / 2 - 3, py - 6, pw + 6, 8, 4); ctx.fill();
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
