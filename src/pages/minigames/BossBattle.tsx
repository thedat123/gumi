import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MissionDone } from '../../components/MissionDone';
import { Icon } from '../../components/Icon';
import { playSfx } from '../../lib/sfx';
import { useDomGameLoop } from '../../lib/useDomGameLoop';
import { advanceWater, createWaterState, resetWaterState, WATER_CONFIG, WATER_POOL, WATER_STEP, waterClamp, type WaterMode } from '../../lib/waterCatch';
import { bossUrl, prepareWaterArt } from '../../lib/waterArt';
import { vi } from '../../content/vi';
import { ArcadeOverlay, ArcadeStage } from '../../components/ArcadeStage';
import { Banner } from '../../components/Banner';
import { actOfDay } from '../../lib/scoring';
import './water-catch.css';

/** Catching stays entirely local. Day 14 opens the graduation wall only after a win. */
export function BossBattle({ onWon }: { onWon?: () => void } = {}) {
  const { day: dayParam } = useParams();
  const day = Number(dayParam) || 14;
  const config = day === 21 ? { hp: 26, every: .5, bad: .44, fall: 235, burst: 3.4 } : WATER_CONFIG;
  const act = actOfDay(day);
  const canvas = useRef<HTMLCanvasElement>(null);
  const boss = useRef<HTMLDivElement>(null), health = useRef<HTMLDivElement>(null), road = useRef<HTMLDivElement>(null), lanes = useRef<HTMLDivElement>(null);
  const clock = useRef(0);
  const [carUrl, setCarUrl] = useState('');
  const state = useRef(createWaterState(config));
  const field = useRef<HTMLDivElement>(null), car = useRef<HTMLDivElement>(null);
  const drops = useRef<(HTMLDivElement | null)[]>([]);
  const bounds = useRef({ left: 0, width: 1 });
  const keys = useRef({ left: false, right: false });
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finish = useRef(onWon); finish.current = onWon;
  const [hud, setHud] = useState({ mode: 'ready' as WaterMode, hp: config.hp, lives: 3 });
  const [art, setArt] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [done, setDone] = useState(false);
  const [paused, setPaused] = useState(document.hidden);
  const published = useRef(hud);

  useEffect(() => {
    let cancelled = false;
    setArt('loading');
    void prepareWaterArt().then(url => { if (!cancelled) { setCarUrl(url); setArt('ready'); } })
      .catch(() => { if (!cancelled) setArt('error'); });
    return () => { cancelled = true; };
  }, [loadAttempt]);

  const publish = useCallback(() => {
    const s = state.current, last = published.current;
    if (s.mode !== last.mode || s.hp !== last.hp || s.lives !== last.lives) {
      const next = { mode: s.mode, hp: s.hp, lives: s.lives };
      published.current = next; setHud(next);
    }
  }, []);
  const start = useCallback(() => {
    const s = state.current;
    if (art !== 'ready' || document.hidden || s.mode === 'won' || s.mode === 'play') return;
    if (s.mode === 'dead') resetWaterState(s, config);
    s.mode = 'play'; publish();
  }, [art, config.hp, publish]);

  useEffect(() => {
    if (done) return;
    const fit = () => {
      const rect = field.current?.getBoundingClientRect();
      if (rect) bounds.current = { left: rect.left, width: rect.width };
    };
    fit();
    const observer = new ResizeObserver(fit); if (field.current) observer.observe(field.current);
    const box = field.current;
    const position = (clientX: number) => {
      const rect = bounds.current;
      state.current.target = waterClamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    };
    const move = (event: PointerEvent) => {
      if (state.current.mode === 'play' && (event.pointerType === 'mouse' || event.buttons > 0 || box?.hasPointerCapture(event.pointerId))) position(event.clientX);
    };
    const down = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('button,a')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      start();
      if (state.current.mode !== 'play') return;
      event.preventDefault(); box?.setPointerCapture(event.pointerId); position(event.clientX);
    };
    box?.addEventListener('pointermove', move); box?.addEventListener('pointerdown', down);
    const clearKeys = () => { keys.current.left = keys.current.right = false; };
    const visibility = () => { state.current.accumulator = 0; clearKeys(); setPaused(document.hidden); };
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input,textarea,button,a')) return;
      if (['ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyD'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' && !e.repeat) start();
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.current.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.current.right = false;
    };
    window.addEventListener('keydown', key); window.addEventListener('keyup', up); window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      box?.removeEventListener('pointermove', move); box?.removeEventListener('pointerdown', down);
      observer.disconnect(); clearTimeout(finishTimer.current);
      window.removeEventListener('keydown', key); window.removeEventListener('keyup', up); window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [done, start]);

  useDomGameLoop(field, (w, h, dt) => {
    const s = state.current, previousHp = s.hp, previousLives = s.lives, previousMode = s.mode;
    if (s.mode === 'play') s.target = waterClamp(s.target + (Number(keys.current.right) - Number(keys.current.left)) * dt * .9, 0, 1);
    advanceWater(s, dt, w, h, config);
    if (s.hp !== previousHp) playSfx('sip');
    else if (s.lives !== previousLives) playSfx('sleep');
    if (s.mode === 'won' && previousMode !== 'won') {
      playSfx('win');
      finishTimer.current = setTimeout(() => { if (finish.current) finish.current(); else setDone(true); }, 800);
    }
    publish();
    clock.current += dt;
    const time = clock.current;
    const width = waterClamp(w * .17, 74, 140);
    const radius = waterClamp(w * .2, 70, 140), bossY = Math.max(h * .2, radius * 1.15);
    if (boss.current) {
      boss.current.style.width = `${radius * 1.56}px`;
      boss.current.style.height = `${radius * 1.78}px`;
      boss.current.style.transform = `translate3d(${w / 2 - radius * .78}px,${bossY - radius * .78 + Math.sin(time * 2) * radius * .035}px,0) rotate(${Math.sin(time * 1.6) * .035}rad)`;
    }
    if (health.current) {
      health.current.style.width = `${radius * 2}px`;
      health.current.style.transform = `translate3d(${w / 2 - radius}px,${Math.max(6, bossY - radius * 1.05)}px,0)`;
    }
    if (road.current) road.current.style.top = `${h * .85 + width * .28}px`;
    if (lanes.current) {
      lanes.current.style.top = `${width * .2}px`;
      lanes.current.style.transform = `translate3d(-${(time * 65) % 65}px,0,0)`;
    }
    if (car.current) {
      const size = `${width * 140 / 110}px`;
      if (car.current.style.width !== size) car.current.style.width = size;
      car.current.style.transform = `translate3d(${s.x * w - width * 70 / 110}px,${h * .85 - width * 88 / 110}px,0)`;
    }
    const alpha = waterClamp(s.accumulator / WATER_STEP, 0, 1);
    for (let i = 0; i < WATER_POOL; i++) {
      const node = drops.current[i], drop = s.drops[i];
      if (!node) continue;
      if (!drop.active) { if (!node.hidden) node.hidden = true; continue; }
      node.hidden = false;
      const kind = drop.good ? drop.kind === 0 ? 'water' : 'tea' : drop.kind === 2 ? 'candy' : drop.kind === 0 ? 'cube' : 'sugar';
      if (node.dataset.kind !== kind) node.dataset.kind = kind;
      const ix = (drop.previousX + (drop.x - drop.previousX) * alpha) * w - 14;
      const iy = (drop.previousY + (drop.y - drop.previousY) * alpha) * h - 14;
      node.style.transform = `translate3d(${ix}px,${iy}px,0)`;
    }
  }, !done && (hud.mode === 'ready' || hud.mode === 'play'));

  if (done) return <MissionDone day={day} points={vi.missions[day - 1]?.points ?? 30} note="Bạn đã đánh bại Boss Đường!" />;

  const retry = () => { resetWaterState(state.current, config); publish(); };
  const action = art === 'error' ? () => setLoadAttempt(n => n + 1) : hud.mode === 'dead' ? retry : start;
  const button = <button type="button" disabled={art === 'loading'} aria-busy={art === 'loading'} onPointerDown={event => event.stopPropagation()} onClick={action} className="rounded-pill border border-black/15 bg-primary px-6 py-2.5 font-bold text-on-primary shadow-pop active:scale-95">{art === 'loading' ? 'Đang tải hình ảnh…' : art === 'error' ? 'Tải lại hình ảnh' : hud.mode === 'dead' ? vi.minigames.common.retry : vi.minigames.common.start}</button>;
  const hearts = <span className="flex shrink-0 items-center gap-1 rounded-pill bg-surface/90 px-3 py-1.5 shadow-soft backdrop-blur" aria-label={`Còn ${hud.lives} mạng`}>
    {[0, 1, 2].map(i => <Icon key={i} name="heart" size={16} filled={i < hud.lives} className={i < hud.lives ? 'text-primary' : 'text-border-strong/40'}/>)}
  </span>;
  return <div className="water-game"><ArcadeStage act={act} title={day === 21 ? 'Đại Chiến Boss Cuối' : 'Đánh Bại Boss Đường'} hint="Rê để hứng 💧 nước lành · né 🧊 đường xấu" hud={hearts} boxRef={field} canvasRef={canvas}
    scenery={<div className={`water-scene water-scene-${act}`} aria-hidden="true">
      <div className="water-boss" ref={boss}><img src={bossUrl} alt="" draggable={false} decoding="async"/></div>
      <div className="water-boss-bar" ref={health}><i style={{ transform: `scaleX(${hud.hp / config.hp})` }}/></div>
      <div className="water-ground"/>
      <div className="water-road" ref={road}><div className="water-lanes" ref={lanes}/></div>
      {Array.from({ length: WATER_POOL }, (_, i) => <div key={i} className="water-drop" hidden ref={node => { drops.current[i] = node; }}>
        <svg className="water-good" viewBox="-14 -14 28 28" aria-hidden="true"><path d="M0-13C11 0 8 12 0 12C-8 12-11 0 0-13Z" fill="currentColor"/><circle cx="-3" cy="1" r="2.5" fill="#ffffff99"/></svg>
        <svg className="water-bad" viewBox="-14 -14 28 28" aria-hidden="true"><rect x="-11" y="-11" width="22" height="22" rx="5" fill="currentColor" stroke="#0000001f" strokeWidth="2"/><rect x="-7" y="-7" width="6" height="6" rx="2" fill="#ffffff80"/></svg>
      </div>)}
      <div className="water-car" ref={car}>{carUrl && <img src={carUrl} alt="" draggable={false}/>}</div>
    </div>}
    overlay={paused ? <ArcadeOverlay><p className="text-title font-extrabold text-white">Tạm dừng</p></ArcadeOverlay> : hud.mode === 'ready' ? <ArcadeOverlay>
      <p className="text-title font-extrabold text-white drop-shadow">Hạ gục Boss Đường!</p>
      <p className="max-w-sm text-small font-medium text-white/90">Rê nhân vật để hứng <b>nước lành 💧🍵</b> làm tan độ ngọt của Boss. Né <b>đường xấu 🧊🥤🍬</b> — dính là mất mạng. Còn 3 mạng.</p>
      {button}
    </ArcadeOverlay> : hud.mode === 'dead' ? <ArcadeOverlay>
      <Banner kind="error">Hết mạng rồi! Boss còn {hud.hp} độ ngọt.</Banner>
      {button}
    </ArcadeOverlay> : null}
  /></div>;
}
