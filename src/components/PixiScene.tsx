import { useEffect, useRef } from 'react';
import { Application, Container, Graphics } from 'pixi.js';

type Act = 1 | 2 | 3 | 'room';

interface Bit { g: Graphics; x: number; y: number; vx: number; vy: number; r: number; a: number; phase: number; sw: number }

const TINT: Record<Act, number> = { 1: 0xdaf6b4, 2: 0xffe39a, 3: 0xffffff, room: 0xffe4b0 };
const FOG: Record<Act, number> = { 1: 0xd8f0c0, 2: 0xe6d6f5, 3: 0xffffff, room: 0xffe0a6 };
const COUNT: Record<Act, number> = { 1: 34, 2: 26, 3: 46, room: 22 };

/**
 * Lớp hạt động bằng WebGL (PixiJS) phủ lên cảnh CSS: đầm lầy sủi bọt, rừng bay phấn, đỉnh rơi tuyết.
 * Mượt hơn CSS, tự dừng khi rời màn/huỷ, và đứng yên khi người dùng bật "giảm chuyển động".
 */
export function PixiScene({ act }: { act: Act }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let app: Application | null = null;
    let destroyed = false;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    (async () => {
      const a = new Application();
      try {
        await a.init({ resizeTo: el, backgroundAlpha: 0, antialias: true, powerPreference: 'low-power', autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
      } catch { return; } // WebGL không khả dụng → bỏ qua, cảnh CSS vẫn còn
      if (destroyed) { a.destroy(true); return; }
      app = a;
      a.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      el.appendChild(a.canvas);

      const W = () => a.screen.width;
      const H = () => a.screen.height;

      // Sương/ánh sáng: vài quầng lớn trôi ngang.
      const fogLayer = new Container();
      a.stage.addChild(fogLayer);
      const fogs = Array.from({ length: 3 }, () => {
        const r = rnd(H() * 0.5, H() * 0.9);
        const g = new Graphics().circle(0, 0, r).fill({ color: FOG[act], alpha: 0.06 });
        g.x = rnd(0, W()); g.y = rnd(H() * 0.35, H() * 0.9);
        fogLayer.addChild(g);
        return { g, x: g.x, vx: rnd(-6, 6) };
      });

      // Hạt: bọt (act1) / phấn (act2) / tuyết (act3).
      const bitLayer = new Container();
      a.stage.addChild(bitLayer);
      const mk = (): Bit => {
        const r = act === 1 ? rnd(2, 8) : act === 3 ? rnd(1.5, 4) : act === 'room' ? rnd(1.5, 4) : rnd(1.5, 5);
        const g = new Graphics().circle(0, 0, r).fill({ color: TINT[act], alpha: 1 });
        const fromTop = act === 3;
        const x = rnd(0, W());
        const y = fromTop ? rnd(-H() * 0.2, 0) : rnd(H(), H() * 1.2);
        const speed = act === 1 ? rnd(14, 34) : act === 2 ? rnd(10, 24) : act === 'room' ? rnd(5, 13) : rnd(24, 52);
        const b: Bit = {
          g, x, y, r,
          vx: act === 2 ? rnd(10, 26) : act === 'room' ? rnd(-3, 3) : rnd(-6, 6),
          vy: fromTop ? speed : -speed,
          a: rnd(0.35, 0.9), phase: rnd(0, Math.PI * 2), sw: rnd(6, 18),
        };
        g.x = x; g.y = y; g.alpha = 0;
        bitLayer.addChild(g);
        return b;
      };
      const bits = Array.from({ length: COUNT[act] }, mk);

      const recycle = (b: Bit) => {
        if (act === 3) { b.y = rnd(-H() * 0.2, -5); b.x = rnd(0, W()); }
        else { b.y = rnd(H(), H() * 1.15); b.x = rnd(0, W()); }
        b.a = rnd(0.35, 0.9);
      };

      const step = (dt: number) => {
        for (const f of fogs) {
          f.x += f.vx * dt; if (f.x < -H()) f.x = W() + H(); if (f.x > W() + H()) f.x = -H();
          f.g.x = f.x;
        }
        for (const b of bits) {
          b.phase += dt * 1.4;
          b.x += (b.vx + Math.sin(b.phase) * b.sw) * dt;
          b.y += b.vy * dt;
          const off = act === 3 ? b.y > H() + 10 : b.y < -10;
          if (off) recycle(b);
          b.g.x = b.x; b.g.y = b.y;
          b.g.alpha = b.a * (0.6 + 0.4 * Math.sin(b.phase * 0.6));
        }
      };

      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm');
      if (reduce) {
        for (const b of bits) { b.g.alpha = b.a * 0.7; }
      } else {
        a.ticker.add((t) => step(t.deltaMS / 1000));
      }
    })();

    return () => {
      destroyed = true;
      if (app) { try { app.destroy(true, { children: true }); } catch { /* đã huỷ */ } }
    };
  }, [act]);

  return <div ref={host} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0" />;
}
