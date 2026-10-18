import { useEffect, useRef, type RefObject } from 'react';
import { getQuality, markDeviceSlow } from './quality';

/**
 * Vòng lặp game 2D dùng chung: tự đo & scale canvas theo khung (DPR), gọi onFrame(ctx, w, h, dt) mỗi khung hình.
 * Trạng thái game nên giữ ở useRef; chỉ đẩy sang React state khi cần cập nhật HUD/overlay.
 *
 * NHẸ cho máy yếu (lấy từ quality.ts):
 *  • trần DPR theo hạng máy (low=1 → ÍT pixel phải tô nhất, mid=1.5, high=2) → giảm mạnh tải GPU/CPU;
 *  • giới hạn FPS (low=30, mid=60) → bỏ bớt khung dư, đỡ nóng/lag;
 *  • dừng hẳn vòng lặp khi tab ẩn/đổi app → không ngốn pin, không "nhảy" dt khi quay lại.
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
    // alpha:false → trình duyệt khỏi phải trộn canvas với nền trang mỗi khung (game vẽ kín nền) → mượt hơn, free.
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const q = getQuality();
    let dprCap = q.pixelRatio;                               // trần DPR hiện tại (hạ dần nếu máy đuối)
    let targetFps = q.fpsCap > 0 ? q.fpsCap : 60;            // FPS mục tiêu để so sánh
    let frameInterval = q.fpsCap > 0 ? 1000 / q.fpsCap : 0;  // ms giữa 2 khung; 0 = không giới hạn
    let w = 1, h = 1;
    const fit = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(box);
    let raf = 0, last = performance.now(), lastRender = last, stop = false;
    // TỰ THÍCH ỨNG: đo FPS thật mỗi ~1s; không theo kịp mục tiêu → HẠ DPR (ít pixel = đòn mạnh nhất)
    // + siết FPS + hạ CSS toàn app. Nhờ vậy máy bị CPU throttle / quá nhiệt / đời cũ vẫn chơi mượt.
    let winStart = last, winFrames = 0, downgrades = 0;
    const loop = (t: number) => {
      if (stop) return;
      raf = requestAnimationFrame(loop);
      // Giới hạn FPS: bỏ qua khung rAF chưa đủ thời gian (giữ -2ms để không hụt vì jitter).
      if (frameInterval && t - lastRender < frameInterval - 2) return;
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t; lastRender = t;
      frame.current(ctx, w, h, dt);
      winFrames++;
      if (t - winStart >= 1000) {
        const achieved = winFrames * 1000 / (t - winStart);
        if (winFrames >= 5 && achieved < targetFps * 0.7 && downgrades < 4) {
          downgrades++;
          dprCap = Math.max(0.6, dprCap * 0.78);  // giảm độ phân giải canvas (giảm pixel bậc hai)
          targetFps = downgrades >= 2 ? 20 : 30;  // siết khung hình
          frameInterval = 1000 / targetFps;
          fit();
          markDeviceSlow();                        // tắt blur/hiệu ứng CSS + làm nhẹ các mount sau
        }
        winStart = t; winFrames = 0;
      }
    };
    // Tab ẩn → dừng rAF; hiện lại → chạy tiếp, reset mốc thời gian để dt & cửa sổ đo không vọt.
    const onVis = () => {
      if (document.hidden) { stop = true; cancelAnimationFrame(raf); }
      else if (stop) { stop = false; last = lastRender = winStart = performance.now(); winFrames = 0; raf = requestAnimationFrame(loop); }
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(loop);
    return () => { stop = true; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [boxRef, canvasRef]);
}
