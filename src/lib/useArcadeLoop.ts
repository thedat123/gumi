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
    // Game TOÀN MÀN vẽ lại 60 lần/s → DPR cao là phí fill-rate (nặng nhất trên GPU máy cũ như Galaxy A32).
    // Trần 1.25 vẫn nét cho game hoạt hình mà nhẹ hơn nhiều DPR2 → mượt từ khung đầu, rồi hạ tiếp nếu cần.
    let dprCap = Math.min(q.pixelRatio, 1.25);               // trần DPR hiện tại (hạ dần nếu máy đuối)
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
    // TỰ THÍCH ỨNG (kiểu game mobile): đo khung thật, máy không kịp → HẠ DPR (ít pixel = đòn mạnh nhất)
    // + siết FPS + hạ CSS. PHẢN ỨNG NHANH trong vài khung để KHÔNG giật lúc mở, mượt từ đầu trên mọi máy.
    let winStart = last, winFrames = 0, downgrades = 0, slowStreak = 0;
    const downgrade = () => {
      if (downgrades >= 4) return;
      downgrades++;
      dprCap = Math.max(0.6, dprCap * 0.75);   // giảm độ phân giải canvas (giảm pixel bậc hai)
      targetFps = downgrades >= 2 ? 20 : 30;   // siết khung hình
      frameInterval = 1000 / targetFps;
      fit();
      markDeviceSlow();                         // tắt blur/hiệu ứng CSS + làm nhẹ các mount sau
    };
    const loop = (t: number) => {
      if (stop) return;
      raf = requestAnimationFrame(loop);
      // Giới hạn FPS: bỏ qua khung rAF chưa đủ thời gian (giữ -2ms để không hụt vì jitter).
      if (frameInterval && t - lastRender < frameInterval - 2) return;
      const dtMs = t - last;
      const dt = Math.min(0.05, Math.max(0, dtMs / 1000)); last = t; lastRender = t;
      frame.current(ctx, w, h, dt);
      winFrames++;
      // PHẢN ỨNG NHANH: 5 khung LIÊN TIẾP trễ hơn mục tiêu (~<44fps) → máy không theo kịp → hạ NGAY.
      const targetDt = 1000 / (targetFps || 60);
      if (dtMs > targetDt * 1.35) { if (++slowStreak >= 5) { downgrade(); slowStreak = 0; } } else slowStreak = 0;
      // Backstop theo cửa sổ ~0.6s: FPS trung bình < 80% mục tiêu thì hạ tiếp (bắt cả máy chạy ~45–50fps cứ ì ạch).
      if (t - winStart >= 600) {
        const achieved = winFrames * 1000 / (t - winStart);
        if (winFrames >= 4 && achieved < targetFps * 0.8) downgrade();
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
