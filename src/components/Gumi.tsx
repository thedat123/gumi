import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { vi } from '../content/vi';
import { useAnimationPause } from '../hooks/useAnimationPause';
import type { GumiEvent, GumiState } from '../api/types';

interface Props {
  state: GumiState;
  size?: number;
  /** Sự kiện chạy một lần (nhảy mừng, hồi sinh, tiến hoá). Đổi eventKey để chạy lại. */
  event?: GumiEvent | null;
  eventKey?: number;
  /** Cho phép bấm vào để Gumi nhảy và nói. */
  interactive?: boolean;
  onEventEnd?: () => void;
}

const CLASS: Record<GumiState, string> = { bo_pho: 'gumi--bo-pho', hap_hoi: 'gumi--hap-hoi', tien_hoa: 'gumi--tien-hoa' };
const SPARKLES = [
  { x: 40, y: 50, dx: -26, dy: -34, d: 0 }, { x: 160, y: 50, dx: 26, dy: -34, d: 0.08 }, { x: 100, y: 20, dx: 0, dy: -44, d: 0.16 },
  { x: 24, y: 110, dx: -34, dy: -16, d: 0.24 }, { x: 176, y: 110, dx: 34, dy: -16, d: 0.32 },
];

/** Mascot Gumi bằng SVG + CSS. Chỉ animate transform/opacity; trang trí nên ẩn khỏi trình đọc màn hình (chữ trạng thái nằm ở nơi khác). */
export function Gumi({ state, size = 200, event = null, eventKey = 0, interactive = false, onEventEnd }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useAnimationPause(ref);
  const hopDelay = useMemo(() => Math.round(Math.random() * 4000) / 1000, []);
  const [poke, setPoke] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);
  const [shown, setShown] = useState<GumiState>(event === 'evolve' ? 'bo_pho' : state);

  // Tiến hoá: hiển thị dạng cũ trước, đổi sang dạng mới ở giữa hoạt ảnh (lúc đang loé sáng).
  useEffect(() => {
    if (event === 'evolve') {
      setShown('bo_pho');
      const t = setTimeout(() => setShown(state), 900);
      return () => clearTimeout(t);
    }
    setShown(state);
  }, [state, event, eventKey]);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 2400);
    return () => clearTimeout(t);
  }, [bubble]);

  const onPoke = () => {
    if (!interactive) return;
    const lines = vi.gumi.bubbles[shown];
    setBubble(lines[poke % lines.length] ?? '');
    setPoke((n) => n + 1);
  };

  const cls = ['gumi', CLASS[shown], event ? `is-${event}` : '', poke && !event ? 'is-poke' : '', bubble ? 'has-bubble' : ''].filter(Boolean).join(' ');
  const fit = shown === 'tien_hoa';
  const bellyRx = fit ? 44 : 68;
  const style = { '--gumi-size': `${size}px`, '--hop-delay': `${hopDelay}s` } as CSSProperties;

  return (
    <div
      ref={ref}
      className={cls}
      style={style}
      data-state={shown}
      data-paused={paused ? 'true' : 'false'}
      onClick={onPoke}
      onAnimationEnd={(e) => { if (e.target instanceof Element && e.target.classList.contains('g-actor')) onEventEnd?.(); }}
    >
      <svg viewBox="0 0 200 220" aria-hidden="true" focusable="false">
        <ellipse className="g-shadow" cx="100" cy="208" rx={fit ? 46 : 64} ry="8" />
        <g className="g-actor" key={`${poke}-${eventKey}`}>
          <g className="g-breath">
            <path className="g-body" d="M150 170 q40 -8 34 -46 q-4 -12 -14 -4 q4 24 -22 32z" />
            <ellipse className="g-body" cx="100" cy="150" rx={bellyRx} ry="56" />
            <ellipse className="g-belly" cx="100" cy="158" rx={bellyRx - 22} ry="38" />
            <path className="g-body" d="M62 62 L70 22 L96 46z" />
            <path className="g-body" d="M138 62 L130 22 L104 46z" />
            <path className="g-dark" d="M70 54 L73 34 L86 46z" />
            <path className="g-dark" d="M130 54 L127 34 L114 46z" />
            <circle className="g-body" cx="100" cy="88" r="46" />
            <ellipse className="g-body" cx="52" cy="150" rx="12" ry="18" transform="rotate(12 52 150)" />
            <ellipse className="g-body" cx="148" cy="150" rx="12" ry="18" transform="rotate(-12 148 150)" />

            {shown === 'bo_pho' && (
              <g>
                <g className="g-eyes-open">
                  <circle className="g-white" cx="80" cy="90" r="11" /><circle className="g-white" cx="120" cy="90" r="11" />
                  <circle className="g-ink" cx="80" cy="95" r="5" /><circle className="g-ink" cx="120" cy="95" r="5" />
                  <path className="g-body" d="M67 78 h26 v12 h-26z" /><path className="g-body" d="M107 78 h26 v12 h-26z" />
                  <path className="g-stroke" d="M68 90 h24 M108 90 h24" />
                </g>
                <g className="g-eyes-closed"><path className="g-stroke" d="M68 92 q12 8 24 0 M108 92 q12 8 24 0" /></g>
                <path className="g-stroke" d="M90 114 q10 -4 20 0" />
              </g>
            )}
            {shown === 'hap_hoi' && (
              <g>
                <path className="g-stroke" d="M70 82 l20 20 M90 82 l-20 20 M110 82 l20 20 M130 82 l-20 20" />
                <path className="g-stroke" d="M88 118 q6 -8 12 0 q6 8 12 0" />
                <path className="g-sweat" d="M146 66 q8 12 0 18 q-8 -6 0 -18z" />
              </g>
            )}
            {shown === 'tien_hoa' && (
              <g>
                <rect className="g-lens" x="64" y="78" width="30" height="20" rx="8" />
                <rect className="g-lens" x="106" y="78" width="30" height="20" rx="8" />
                <path className="g-stroke" d="M94 86 h12" />
                <path className="g-stroke" d="M86 114 q14 10 28 0" />
              </g>
            )}
          </g>
        </g>
        <circle className="g-flash" cx="100" cy="120" r="96" />
        {SPARKLES.map((s, i) => (
          <path key={i} className="g-sparkle g-star" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--d': `${s.d}s` } as CSSProperties} d={`M${s.x} ${s.y - 7} l2.5 4.5 l5 .5 l-3.8 3.4 l1.2 5 l-4.9 -2.8 l-4.9 2.8 l1.2 -5 l-3.8 -3.4 l5 -.5z`} />
        ))}
      </svg>
      <div className="g-bubble">{bubble}</div>
    </div>
  );
}
