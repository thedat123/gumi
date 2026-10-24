import { useEffect, useRef, type RefObject } from 'react';
import { flightResolution, flightSize } from './flight';

/** Flappy-only loop: no deliberate frame dropping or cumulative quality degradation. */
export function useFlightLoop(
  boxRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onFrame: (context: CanvasRenderingContext2D, width: number, height: number, dt: number, paint: boolean, scale: number) => void,
) {
  const frame = useRef(onFrame);
  frame.current = onFrame;
  useEffect(() => {
    const box = boxRef.current, canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    let w = 1, h = 600, scale = 1, dirty = true;
    const fit = () => {
      const rect = box.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const size = flightSize(rect.width, rect.height);
      w = size.w; h = size.h; scale = rect.height / h; dirty = true;
      const dpr = flightResolution(rect.width, rect.height, window.devicePixelRatio);
      const pixelsW = Math.max(1, Math.round(rect.width * dpr));
      const pixelsH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== pixelsW || canvas.height !== pixelsH) {
        canvas.width = pixelsW; canvas.height = pixelsH; dirty = true;
      }
      ctx.setTransform(pixelsW / w, 0, 0, pixelsH / h, 0, 0);
    };
    fit();
    const observer = new ResizeObserver(fit); observer.observe(box);
    let raf = 0, previous = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min((now - previous) / 1000, .1));
      previous = now;
      frame.current(ctx, w, h, dt, dirty, scale); dirty = false;
      raf = requestAnimationFrame(loop);
    };
    const visibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { previous = performance.now(); dirty = true; raf = requestAnimationFrame(loop); }
    };
    document.addEventListener('visibilitychange', visibility);
    if (!document.hidden) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [boxRef, canvasRef]);
}
