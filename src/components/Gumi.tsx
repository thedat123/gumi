import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { vi } from '../content/vi';
import { useAnimationPause } from '../hooks/useAnimationPause';
import { useSkin } from '../app/skin';
import { skinById, type Skin } from '../lib/skins';
import { playSfx, type Sfx } from '../lib/sfx';
import type { GumiEvent, GumiState } from '../api/types';

interface Props {
  state: GumiState;
  size?: number;
  /** Sự kiện chạy một lần (nhảy mừng, hồi sinh, tiến hoá). Đổi eventKey để chạy lại. */
  event?: GumiEvent | null;
  eventKey?: number;
  /** Cho phép bấm vào để Gumi nhảy và nói. */
  interactive?: boolean;
  /** Tiến độ 0..1: càng cao, bụng Gumi càng nhỏ (khoẻ dần) trước khi tiến hoá hẳn ở Day 21. */
  progress?: number;
  /** Ép dùng một skin cụ thể (xem trước ở tủ đồ). Bỏ trống thì dùng skin đang chọn. */
  skinId?: string;
  /** Tín hiệu "cho ăn" từ ngoài (kéo-thả đồ ăn). Đổi key để Gumi ăn món mới. */
  feed?: { food: string; key: number } | null;
  onEventEnd?: () => void;
}

/** Phụ kiện theo skin, vẽ quanh đầu Gumi (đầu: cx100 cy88 r46; tai đỉnh ~y22). */
function SkinAccessory({ skin }: { skin: Skin }): ReactElement | null {
  const c = skin.accessoryColor ?? '#F5C542';
  switch (skin.accessory) {
    case 'cap':
      return (
        <g>
          <path d="M58 52 Q100 12 142 52 Q100 40 58 52 Z" fill={c} />
          <rect x="118" y="48" width="42" height="8" rx="4" fill={c} />
          <circle cx="100" cy="20" r="4" fill={c} />
        </g>
      );
    case 'headband':
      return (
        <g>
          <rect x="54" y="44" width="92" height="12" rx="6" fill={c} />
          <path d="M146 40 l18 -8 l-4 16 l6 12 l-18 -6 z" fill={c} />
        </g>
      );
    case 'helmet':
      return (
        <g fill="none" stroke={c} strokeWidth="5" opacity="0.85">
          <circle cx="100" cy="86" r="60" />
          <path d="M70 54 Q86 40 104 44" strokeWidth="4" opacity="0.7" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M62 52 L62 28 L80 42 L100 22 L120 42 L138 28 L138 52 Z" fill={c} stroke="#C79A3E" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="100" cy="34" r="3.5" fill="#B3261E" />
          <circle cx="72" cy="40" r="3" fill="#1F7A4D" />
          <circle cx="128" cy="40" r="3" fill="#1F7A4D" />
        </g>
      );
    case 'halo':
      return <ellipse cx="100" cy="18" rx="30" ry="8" fill="none" stroke={c} strokeWidth="5" opacity="0.9" />;
    default:
      return null;
  }
}

const CLASS: Record<GumiState, string> = { bo_pho: 'gumi--bo-pho', hap_hoi: 'gumi--hap-hoi', tien_hoa: 'gumi--tien-hoa' };

// Kho "hành động" khi chạm vào Gumi (kiểu màn hình thú cưng trên smartwatch).
type ActionName = 'roll' | 'flip' | 'jump' | 'spin' | 'dance' | 'shake' | 'nod' | 'eat' | 'drink' | 'love' | 'music' | 'sleep' | 'ball' | 'cheer';
const TAP_ACTIONS: ActionName[] = ['roll', 'flip', 'jump', 'spin', 'dance', 'shake', 'nod', 'eat', 'drink', 'love', 'music', 'sleep', 'ball', 'cheer'];
const IDLE_ACTIONS: ActionName[] = ['jump', 'dance', 'shake', 'nod', 'love', 'music', 'sleep', 'spin'];
const FOODS = ['🍎', '🍙', '🍣', '🍰', '🍌', '🍪', '🐟', '🧁'];
const PROP_EMOJI: Partial<Record<ActionName, string>> = { drink: '🥤', love: '💗', music: '🎵', sleep: '💤', ball: '⚽' };
const ACTION_SFX: Record<ActionName, Sfx> = {
  roll: 'boing', flip: 'boing', jump: 'boing', spin: 'boing', ball: 'boing',
  dance: 'happy', music: 'happy', love: 'happy', cheer: 'sparkle',
  shake: 'pop', nod: 'pop', eat: 'chew', drink: 'sip', sleep: 'sleep',
};
const SPARKLES = [
  { x: 40, y: 50, dx: -26, dy: -34, d: 0 }, { x: 160, y: 50, dx: 26, dy: -34, d: 0.08 }, { x: 100, y: 20, dx: 0, dy: -44, d: 0.16 },
  { x: 24, y: 110, dx: -34, dy: -16, d: 0.24 }, { x: 176, y: 110, dx: 34, dy: -16, d: 0.32 },
];

/** Mascot Gumi bằng SVG + CSS. Chỉ animate transform/opacity; trang trí nên ẩn khỏi trình đọc màn hình (chữ trạng thái nằm ở nơi khác). */
export function Gumi({ state, size = 200, event = null, eventKey = 0, interactive = false, progress = 0, skinId, feed = null, onEventEnd }: Props) {
  const { skinId: ctxSkin } = useSkin();
  const skin = skinById(skinId ?? ctxSkin);
  const ref = useRef<HTMLDivElement>(null);
  const paused = useAnimationPause(ref);
  const hopDelay = useMemo(() => Math.round(Math.random() * 4000) / 1000, []);
  const [poke, setPoke] = useState(0);
  const [action, setAction] = useState<{ name: ActionName; prop?: string } | null>(null);
  const clearT = useRef<number | undefined>(undefined);
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

  // Chạm/tự động → chọn ngẫu nhiên 1 trong hàng chục hành động (lăn, ăn, uống, thả tim, ngủ, đá bóng...).
  const runAction = (name: ActionName, prop: string | undefined, withBubble: boolean, sound: boolean) => {
    setAction({ name, prop });
    setPoke((n) => n + 1);
    if (withBubble) { const lines = vi.gumi.bubbles[shown]; setBubble(lines[poke % lines.length] ?? ''); }
    if (sound) playSfx(ACTION_SFX[name]);
    window.clearTimeout(clearT.current);
    clearT.current = window.setTimeout(() => setAction(null), 1700);
  };
  const trigger = (pool: readonly ActionName[], withBubble: boolean, sound: boolean) => {
    const name = pool[Math.floor(Math.random() * pool.length)]!;
    const prop = name === 'eat' ? FOODS[Math.floor(Math.random() * FOODS.length)] : PROP_EMOJI[name];
    runAction(name, prop, withBubble, sound);
  };
  const onPoke = () => { if (interactive) trigger(TAP_ACTIONS, true, true); };

  // Cho ăn bằng kéo-thả: Gumi nhai đúng món được thả vào.
  useEffect(() => {
    if (!feed) return;
    runAction('eat', feed.food, true, true);
  }, [feed?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tự cử động lâu lâu (không cần chạm) để Gumi không đứng yên.
  useEffect(() => {
    if (!interactive) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm');
    if (reduce) return;
    const id = setInterval(() => { if (!document.hidden) trigger(IDLE_ACTIONS, false, false); }, 6000 + Math.random() * 4000);
    return () => { clearInterval(id); window.clearTimeout(clearT.current); };
  }, [interactive, shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const cls = ['gumi', CLASS[shown], event ? `is-${event}` : '', action && !event ? `act-${action.name}` : '', bubble ? 'has-bubble' : ''].filter(Boolean).join(' ');
  const fit = shown === 'tien_hoa';
  // Bụng thu nhỏ dần theo tiến độ (68 → 44) khi còn ở dạng bơ phờ; tiến hoá thì gọn hẳn.
  const p = Math.min(1, Math.max(0, progress));
  const bellyRx = fit ? 44 : Math.round(68 - 24 * p);
  const style = {
    '--gumi-size': `${size}px`,
    '--hop-delay': `${hopDelay}s`,
    ...(skin.colors?.gumi ? { '--color-gumi': skin.colors.gumi } : {}),
    ...(skin.colors?.dark ? { '--color-gumi-dark': skin.colors.dark } : {}),
    ...(skin.colors?.belly ? { '--color-gumi-belly': skin.colors.belly } : {}),
  } as CSSProperties;

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
        <defs>
          <radialGradient id="gHi" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffffff" stopOpacity="0.6" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
          <radialGradient id="gCore" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#2A1A15" stopOpacity="0.2" /><stop offset="1" stopColor="#2A1A15" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="100" cy="210" rx={fit ? 58 : 80} ry="11" fill="rgba(0,0,0,0.06)" />
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

            {/* Tô khối 3D: bắt sáng phía trên–trái, tối dồn phía dưới */}
            <ellipse cx="84" cy="72" rx="30" ry="24" fill="url(#gHi)" />
            <ellipse cx="88" cy="150" rx="20" ry="30" fill="url(#gHi)" opacity="0.55" />
            <ellipse cx="100" cy="176" rx={bellyRx - 4} ry="34" fill="url(#gCore)" />
            <ellipse cx="100" cy="120" rx="44" ry="20" fill="url(#gCore)" opacity="0.5" />

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
            <SkinAccessory skin={skin} />
          </g>
        </g>
        <circle className="g-flash" cx="100" cy="120" r="96" />
        {SPARKLES.map((s, i) => (
          <path key={i} className="g-sparkle g-star" style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--d': `${s.d}s` } as CSSProperties} d={`M${s.x} ${s.y - 7} l2.5 4.5 l5 .5 l-3.8 3.4 l1.2 5 l-4.9 -2.8 l-4.9 2.8 l1.2 -5 l-3.8 -3.4 l5 -.5z`} />
        ))}
      </svg>
      {action?.prop && !event && <span key={poke} className={`gumi-prop prop-${action.name}`} style={{ fontSize: Math.round(size * 0.26) }} aria-hidden="true">{action.prop}</span>}
      <div className="g-bubble">{bubble}</div>
    </div>
  );
}
