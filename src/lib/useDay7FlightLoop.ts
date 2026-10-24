import { useEffect, useRef, type RefObject } from 'react';

/** Native-resolution DOM scenery: no full-screen canvas repaint or FPS throttling. */
export function useDay7FlightLoop(
  boxRef: RefObject<HTMLDivElement | null>,
  onFrame: (width: number, height: number, dt: number) => void,
  enabled = true,
) {
  const frame = useRef(onFrame);
  frame.current = onFrame;
  useEffect(() => {
    if (!enabled) return;
    const box = boxRef.current;
    if (!box) return;
    let width = 1, height = 1;
    const fit = () => {
      const rect = box.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    };
    fit();
    const observer = new ResizeObserver(fit); observer.observe(box);
    let raf = 0, previous = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(.05, Math.max(0, (now - previous) / 1000));
      previous = now; frame.current(width, height, dt);
      raf = requestAnimationFrame(loop);
    };
    const visibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) { previous = performance.now(); raf = requestAnimationFrame(loop); }
    };
    document.addEventListener('visibilitychange', visibility);
    if (!document.hidden) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [boxRef, enabled]);
}
