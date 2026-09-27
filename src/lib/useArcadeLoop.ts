import { useEffect, useRef, type RefObject } from 'react';

/**
 * Vòng lặp game 2D dùng chung: tự đo & scale canvas theo khung (DPR), gọi onFrame(ctx, w, h, dt) mỗi khung hình.
 * Trạng thái game nên giữ ở useRef; chỉ đẩy sang React state khi cần cập nhật HUD/overlay.
 */
export function useArcadeLoop(
  boxRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onFrame: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void,
) {
  const frame = useRef(onFrame);
  frame.current = onFrame;
  useEffect(() => {
    const box = boxRef.current, canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 1, h = 1;
    const fit = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(box);
    let raf = 0, last = performance.now(), stop = false;
    const loop = (t: number) => {
      if (stop) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
      frame.current(ctx, w, h, dt);
    };
    raf = requestAnimationFrame(loop);
    return () => { stop = true; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [boxRef, canvasRef]);
}
