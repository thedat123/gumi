import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { vi } from '../content/vi';
import { useAnimationPause } from '../hooks/useAnimationPause';
import { useOutfit } from '../app/skin';
import { type Outfit } from '../lib/wardrobe';
import { playSfx, type Sfx } from '../lib/sfx';
import gumiImg from '../assets/gumi.png';
import gumiGray from '../assets/gumi-gray.png';
import gumiCream from '../assets/gumi-cream.png';
import gumiMint from '../assets/gumi-mint.png';
import gumiBlue from '../assets/gumi-blue.png';
import gumiPink from '../assets/gumi-pink.png';
import gumiGold from '../assets/gumi-gold.png';
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
  /** Ép dùng một outfit cụ thể (xem trước ở tủ đồ). Bỏ trống thì dùng outfit đang mặc. */
  outfit?: Outfit;
  /** Tín hiệu "cho ăn" từ ngoài (kéo-thả đồ ăn). Đổi key để Gumi ăn món mới. */
  feed?: { food: string; key: number } | null;
  onEventEnd?: () => void;
}

/* ===== PHỤ KIỆN PHỐI TỰ DO — vẽ quanh đầu Gumi (đầu: cx100 cy88 r46; tai đỉnh ~y22; mắt cx80/120 cy90). ===== */
function Hat({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case 'cap':
      return (
        <g>
          <path d="M56 50 Q100 8 144 50 Q100 40 56 50 Z" fill="#4f9e5d" />
          <rect x="118" y="46" width="44" height="9" rx="4.5" fill="#3f8a4d" />
          <circle cx="100" cy="16" r="4.5" fill="#3f8a4d" />
        </g>
      );
    case 'bow':
      return (
        <g transform="translate(72 40)">
          <path d="M0 0 L-18 -12 Q-24 0 -18 12 Z" fill="#E7799B" />
          <path d="M0 0 L18 -12 Q24 0 18 12 Z" fill="#E7799B" />
          <path d="M0 0 L-18 -12 Q-14 -4 -8 -2 Z" fill="#D45E82" />
          <path d="M0 0 L18 -12 Q14 -4 8 -2 Z" fill="#D45E82" />
          <circle r="5" fill="#F3A7C0" />
        </g>
      );
    case 'beanie':
      return (
        <g>
          <path d="M54 52 Q100 4 146 52 Z" fill="#C9603F" />
          <path d="M60 40 Q100 18 140 40" fill="none" stroke="#A94E32" strokeWidth="3" opacity="0.6" />
          <rect x="52" y="46" width="96" height="12" rx="6" fill="#E0754F" />
          <circle cx="100" cy="12" r="8" fill="#F0A488" />
        </g>
      );
    case 'party':
      return (
        <g>
          <path d="M100 2 L82 50 L118 50 Z" fill="#F5C542" stroke="#DCAF2E" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M88 38 L112 38 M92 26 L108 26" stroke="#E7799B" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="2" r="5" fill="#E7799B" />
        </g>
      );
    case 'headband':
      return (
        <g>
          <rect x="54" y="44" width="92" height="12" rx="6" fill="#B3261E" />
          <path d="M146 40 l18 -8 l-4 16 l6 12 l-18 -6 z" fill="#B3261E" />
        </g>
      );
    case 'helmet':
      return (
        <g>
          <circle cx="100" cy="86" r="60" fill="none" stroke="#7EC9E0" strokeWidth="6" opacity="0.75" />
          <path d="M70 54 Q86 40 104 44" fill="none" stroke="#EAF6FB" strokeWidth="4" opacity="0.8" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M62 52 L62 26 L80 42 L100 20 L120 42 L138 26 L138 52 Z" fill="#F5C542" stroke="#C79A3E" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="100" cy="32" r="3.5" fill="#B3261E" />
          <circle cx="72" cy="38" r="3" fill="#1F7A4D" />
          <circle cx="128" cy="38" r="3" fill="#1F7A4D" />
        </g>
      );
    case 'halo':
      return <ellipse cx="100" cy="16" rx="30" ry="8" fill="none" stroke="#F2C879" strokeWidth="5" opacity="0.95" />;
    default:
      return null;
  }
}

function Glasses({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case 'sunglasses':
      return (
        <g>
          <rect x="62" y="80" width="32" height="21" rx="9" fill="#2A2320" />
          <rect x="106" y="80" width="32" height="21" rx="9" fill="#2A2320" />
          <path d="M94 87 h12" stroke="#2A2320" strokeWidth="4" strokeLinecap="round" />
          <path d="M62 84 l-10 -4 M138 84 l10 -4" stroke="#2A2320" strokeWidth="3" strokeLinecap="round" />
          <path d="M68 85 q6 -3 12 0" stroke="#5a5048" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case 'round':
      return (
        <g fill="rgba(255,255,255,0.14)" stroke="#C79A3E" strokeWidth="4">
          <circle cx="80" cy="90" r="13" /><circle cx="120" cy="90" r="13" />
          <path d="M93 90 h14" strokeWidth="3.5" /><path d="M67 88 l-12 -4 M133 88 l12 -4" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'star':
      return (
        <g fill="#F5C542" stroke="#DCAF2E" strokeWidth="1.5">
          <path d="M80 78 l3.2 6.5 l7.2 .8 l-5.4 4.9 l1.6 7.1 l-6.2 -3.7 l-6.2 3.7 l1.6 -7.1 l-5.4 -4.9 l7.2 -.8z" />
          <path d="M120 78 l3.2 6.5 l7.2 .8 l-5.4 4.9 l1.6 7.1 l-6.2 -3.7 l-6.2 3.7 l1.6 -7.1 l-5.4 -4.9 l7.2 -.8z" />
          <path d="M92 88 h16" stroke="#DCAF2E" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'monocle':
      return (
        <g>
          <circle cx="120" cy="90" r="13" fill="rgba(255,255,255,0.16)" stroke="#C79A3E" strokeWidth="4" />
          <path d="M120 103 q-2 18 -14 24" fill="none" stroke="#C79A3E" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

function Neck({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case 'scarf':
      return (
        <g>
          <path d="M66 124 q34 20 68 0 l0 13 q-34 18 -68 0 z" fill="#5B8AC9" />
          <path d="M122 134 l16 34 l-13 4 l-11 -30 z" fill="#436FAB" />
          <path d="M66 124 q34 20 68 0" fill="none" stroke="#7AA6DD" strokeWidth="2" opacity="0.6" />
        </g>
      );
    case 'bowtie':
      return (
        <g transform="translate(100 132)">
          <path d="M0 0 L-20 -11 Q-26 0 -20 11 Z" fill="#B3261E" />
          <path d="M0 0 L20 -11 Q26 0 20 11 Z" fill="#B3261E" />
          <rect x="-5" y="-7" width="10" height="14" rx="3" fill="#8E1C16" />
        </g>
      );
    case 'necklace':
      return (
        <g>
          <path d="M72 126 q28 26 56 0" fill="none" stroke="#E7C86B" strokeWidth="2.5" />
          {[78, 90, 100, 110, 122].map((x, i) => <circle key={x} cx={x} cy={128 + (i === 2 ? 8 : i === 1 || i === 3 ? 5 : 1)} r="2.6" fill="#F5C542" />)}
          <path d="M100 138 l-4 8 l4 4 l4 -4 z" fill="#B3261E" stroke="#F5C542" strokeWidth="1" />
        </g>
      );
    case 'cape':
      return (
        <g>
          <path d="M68 118 Q100 132 132 118 L150 176 Q100 190 50 176 Z" fill="#7A4DB3" opacity="0.92" />
          <path d="M68 118 Q100 130 132 118 L128 128 Q100 138 72 128 Z" fill="#8E63C4" />
          <circle cx="82" cy="122" r="4" fill="#F5C542" /><circle cx="118" cy="122" r="4" fill="#F5C542" />
        </g>
      );
    default:
      return null;
  }
}

/** Lớp NỀN phía sau Gumi (chọn ở tủ đồ). Vẽ trong viewBox 200x220, đứng sau thân. */
function Backdrop({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case 'spotlight':
      return <ellipse cx="100" cy="116" rx="96" ry="104" fill="url(#bgSpot)" />;
    case 'sunburst':
      return (
        <g>
          <g className="bg-spin" style={{ transformOrigin: '100px 116px' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <path key={i} d="M100 116 L92 -30 L108 -30 Z" fill="#FFD27A" opacity="0.28" transform={`rotate(${i * 30} 100 116)`} />
            ))}
          </g>
          <circle cx="100" cy="116" r="70" fill="url(#bgSpot)" />
        </g>
      );
    case 'hearts':
      return (
        <g fill="#F4A6C0" opacity="0.75">
          {[[34, 60, 0.9, 0], [168, 80, 0.7, 0.6], [30, 150, 0.6, 1.2], [172, 150, 0.8, 0.9], [150, 40, 0.5, 1.6]].map(([x, y, s, d], i) => (
            <path key={i} className="bg-float" style={{ animationDelay: `${d}s` }} transform={`translate(${x} ${y}) scale(${s})`}
              d="M0 6 C-10 -4 -7 -16 0 -9 C7 -16 10 -4 0 6" />
          ))}
        </g>
      );
    case 'stars':
      return (
        <g fill="#DCEBFB">
          {[[30, 54, 1], [172, 70, 0.8], [26, 140, 0.7], [176, 150, 1], [150, 34, 0.6], [54, 30, 0.7], [120, 24, 0.5]].map(([x, y, s], i) => (
            <path key={i} className="bg-twinkle" style={{ animationDelay: `${i * 0.3}s` }} transform={`translate(${x} ${y}) scale(${s})`}
              d="M0 -7 l2 5 l5 .5 l-3.8 3.4 l1.2 5 l-4.4 -2.8 l-4.4 2.8 l1.2 -5 l-3.8 -3.4 l5 -.5z" />
          ))}
        </g>
      );
    case 'confetti':
      return (
        <g>
          {[['#F4A6C0', 34, 50], ['#8FD0B0', 168, 66], ['#FFD27A', 40, 130], ['#9EC6E6', 166, 140], ['#E7799B', 150, 34], ['#8FD0B0', 60, 28], ['#FFD27A', 128, 22]].map(([c, x, y], i) => (
            <rect key={i} className="bg-float" style={{ animationDelay: `${i * 0.25}s` }} x={x as number} y={y as number} width="8" height="12" rx="2" fill={c as string} transform={`rotate(${i * 40} ${x as number} ${y as number})`} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

const CLASS: Record<GumiState, string> = { bo_pho: 'gumi--bo-pho', hap_hoi: 'gumi--hap-hoi', tien_hoa: 'gumi--tien-hoa' };

/** Đổi màu lông (tủ đồ): dùng SPRITE recolor sẵn (chỉ đổi lông, giữ viền/yếm/má) → sắc nét, không filter. */
const SKIN: Record<string, string> = {
  default: gumiImg, gray: gumiGray, cream: gumiCream, mint: gumiMint, blue: gumiBlue, pink: gumiPink, gold: gumiGold,
};

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
export function Gumi({ state, size = 200, event = null, eventKey = 0, interactive = false, outfit: propOutfit, feed = null, onEventEnd }: Props) {
  const { outfit: ctxOutfit } = useOutfit();
  const outfit = propOutfit ?? ctxOutfit;
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
  // Sprite theo màu lông (recolor sẵn) + bóng đổ mềm bám hình + biến sắc nhẹ theo trạng thái → "sống".
  const skinSrc = SKIN[outfit.color] ?? gumiImg;
  const stateFx = shown === 'hap_hoi' ? 'saturate(0.55) brightness(0.96) ' : shown === 'tien_hoa' ? 'brightness(1.05) drop-shadow(0 0 5px rgba(245,197,66,0.85)) ' : '';
  const imgFilter = `${stateFx}drop-shadow(0 6px 5px rgba(40,26,20,0.24))`;
  const style = {
    '--gumi-size': `${size}px`,
    '--hop-delay': `${hopDelay}s`,
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
          <radialGradient id="bgSpot" cx="0.5" cy="0.46" r="0.55"><stop offset="0" stopColor="#FFF0C8" stopOpacity="0.9" /><stop offset="0.55" stopColor="#FFE0A0" stopOpacity="0.4" /><stop offset="1" stopColor="#FFE0A0" stopOpacity="0" /></radialGradient>
        </defs>
        {outfit.background !== 'none' && <Backdrop id={outfit.background} />}
        <ellipse cx="100" cy="210" rx={fit ? 58 : 80} ry="11" fill="rgba(0,0,0,0.06)" />
        <ellipse className="g-shadow" cx="100" cy="208" rx={fit ? 46 : 64} ry="8" />
        <g className="g-actor" key={`${poke}-${eventKey}`}>
          <g className="g-breath">
            {/* ẢNH GUMI THẬT (cắt từ mascot.png) · sprite recolor theo màu lông đang chọn. */}
            <image href={skinSrc} x="40" y="30" width="120" height="170" style={{ filter: imgFilter }} preserveAspectRatio="xMidYMid meet" />
            {/* Overlay trạng thái (không đè mặt → đọc rõ): hấp hối = giọt mồ hôi; tiến hoá = lấp lánh */}
            {shown === 'hap_hoi' && <path className="g-sweat" d="M121 74 q8 12 0 18 q-8 -6 0 -18z" />}
            {shown === 'tien_hoa' && (
              <>
                <path className="g-star" d="M52 60 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" />
                <path className="g-star" d="M134 57 l1.8 4.6 l4.6 1.8 l-4.6 1.8 l-1.8 4.6 l-1.8 -4.6 l-4.6 -1.8 l4.6 -1.8z" />
              </>
            )}
            {/* Phụ kiện — canh khớp MẮT THẬT của ảnh (đo được: (80,90)/(120,90) → (69,91)/(113,91)) */}
            <g transform="translate(-18.2 -7.35) scale(1.095)">
              <Neck id={outfit.neck} />
              <Glasses id={outfit.glasses} />
              <Hat id={outfit.hat} />
            </g>
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
