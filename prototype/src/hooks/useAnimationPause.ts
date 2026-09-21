import { useEffect, useState, type RefObject } from 'react';

/** true khi tab bị ẩn hoặc phần tử ra ngoài màn hình: dùng để tạm dừng hoạt ảnh cho đỡ tốn pin. */
export function useAnimationPause(ref: RefObject<Element | null>): boolean {
  const [hidden, setHidden] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    onVis();
    let io: IntersectionObserver | undefined;
    if (ref.current && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([e]) => setOffscreen(!(e?.isIntersecting ?? true)));
      io.observe(ref.current);
    }
    return () => { document.removeEventListener('visibilitychange', onVis); io?.disconnect(); };
  }, [ref]);
  return hidden || offscreen;
}
