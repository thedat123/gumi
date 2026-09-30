import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { vi } from '../content/vi';
import { useAnimationPause } from '../hooks/useAnimationPause';
import { useOutfit } from '../app/skin';
import { type Outfit } from '../lib/wardrobe';
import { playSfx, type Sfx } from '../lib/sfx';
import gumiCream from '../assets/gumi-cream.png';
import gumiBlue from '../assets/gumi-blue.png';
import gumiGold from '../assets/gumi-gold.png';
import gumiRose from '../assets/gumi-rose.png';
import gumiBurgundy from '../assets/gumi-burgundy.png';
import gumiBrown from '../assets/gumi-brown.png';
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

/* Sprite source: ears at y32–63, forehead y57–82, eyes near (69,91)/(113,91), neck y123.
 * A hat needs a rear crown behind the sprite and a front band above the eyes. */
function HatBehind({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case 'cap': return <g className="acc-piece"><path d="M69 61 Q70 43 90 38 Q113 33 132 58 L128 63 Q99 56 69 61 Z" fill="url(#accGreen)" stroke="#28633b" strokeWidth="2" /><path d="M78 51 Q99 40 119 48" fill="none" stroke="#a0dfa7" strokeWidth="2.5" opacity=".7" strokeLinecap="round" /></g>;
    case 'beanie': return <g className="acc-piece"><path d="M66 61 Q67 43 88 35 Q111 28 132 60 Z" fill="url(#accRed)" stroke="#8f392a" strokeWidth="2" /><path d="M80 48 Q101 39 120 48" fill="none" stroke="#f6a28a" strokeWidth="2" opacity=".55" /><circle cx="100" cy="34" r="8" fill="#e89078" stroke="#9e4838" strokeWidth="1.5" /></g>;
    case 'party': return <g className="acc-piece"><path d="M103 25 L86 61 L119 61 Z" fill="url(#accGold)" stroke="#a87918" strokeWidth="2" strokeLinejoin="round" /><path d="M93 49 H112 M98 37 H108" stroke="#DC97A5" strokeWidth="3" strokeLinecap="round" /><circle cx="103" cy="24" r="5" fill="#B83556" /></g>;
    case 'crown': return <g className="acc-piece"><path d="M67 61 L67 38 L83 49 L100 31 L117 49 L133 38 L133 61 Z" fill="url(#accGold)" stroke="#95651b" strokeWidth="2" strokeLinejoin="round" /><circle cx="100" cy="42" r="3" fill="#B83556" /><circle cx="78" cy="48" r="2.5" fill="#3966A4" /><circle cx="123" cy="48" r="2.5" fill="#3966A4" /></g>;
    case 'halo': return <g className="acc-piece"><ellipse cx="100" cy="25" rx="28" ry="7" fill="none" stroke="#ffe4a1" strokeWidth="8" opacity=".45" /><ellipse cx="100" cy="25" rx="28" ry="7" fill="none" stroke="url(#accGold)" strokeWidth="4" /></g>;
    default: return null;
  }
}

function Hat({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case 'cap':
      return (
        <g className="acc-piece">
          <path d="M67 60 Q100 55 132 60 Q145 61 153 66 Q137 70 121 65 Q96 63 67 65 Z" fill="#438a4e" stroke="#28633b" strokeWidth="2" />
          <path d="M76 61 Q101 58 125 62" fill="none" stroke="#b2e8b8" strokeWidth="2" opacity=".7" strokeLinecap="round" />
        </g>
      );
    case 'bow':
      return (
        <g className="acc-piece" transform="translate(66 52) rotate(-18)">
          <path d="M-1 0 Q-11 -15 -24 -11 Q-26 2 -21 13 Q-9 13 -1 2 Z" fill="url(#accPink)" stroke="#9d3d5b" strokeWidth="2" />
          <path d="M2 0 Q13 -14 24 -7 Q25 8 17 13 Q8 11 1 2 Z" fill="url(#accPink)" stroke="#9d3d5b" strokeWidth="2" />
          <path d="M-15 -7 Q-9 -3 -6 1 M16 -5 Q11 -1 7 2" fill="none" stroke="#ffe4eb" strokeWidth="2" opacity=".75" strokeLinecap="round" />
          <path d="M-2 4 L-8 19 L0 16 L5 19 L5 5" fill="#c9617e" stroke="#9d3d5b" strokeWidth="1.5" />
          <circle r="5.5" fill="#B83556" stroke="#8f2944" strokeWidth="1.5" />
        </g>
      );
    case 'beanie':
      return (
        <g className="acc-piece">
          <path d="M65 59 Q100 53 135 59 L135 68 Q101 64 65 68 Z" fill="#cc614b" stroke="#8f392a" strokeWidth="2" />
          {[75, 85, 95, 105, 115, 125].map((x) => <path key={x} d={`M${x} 58 v7`} stroke="#f6a28a" strokeWidth="1.5" opacity=".8" />)}
        </g>
      );
    case 'party':
      return (
        <g className="acc-piece">
          <path d="M85 60 Q103 56 120 60" fill="none" stroke="#8f5a20" strokeWidth="3" strokeLinecap="round" />
          <path d="M86 58 Q102 54 119 58" fill="none" stroke="#ffe5a0" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'headband':
      return (
        <g className="acc-piece">
          <path d="M59 64 Q100 58 141 64 L140 72 Q101 67 60 72 Z" fill="#B83556" stroke="#7d253e" strokeWidth="2" />
          <path d="M140 66 Q150 67 163 61 L158 77 L167 86 Q151 79 139 73 Z" fill="#B83556" stroke="#7d253e" strokeWidth="2" />
        </g>
      );
    case 'helmet':
      return (
        <g className="acc-piece">
          <circle cx="100" cy="86" r="60" fill="rgba(190,233,248,.12)" stroke="url(#accGlass)" strokeWidth="7" />
          <path d="M67 57 Q84 35 108 42" fill="none" stroke="#fff" strokeWidth="5" opacity=".78" strokeLinecap="round" />
          <path d="M145 56 Q156 79 151 103" fill="none" stroke="#4b96b3" strokeWidth="2" opacity=".5" />
        </g>
      );
    case 'crown':
      return (
        <g className="acc-piece">
          <path d="M67 59 Q100 56 133 59 L133 65 Q100 62 67 65 Z" fill="url(#accGold)" stroke="#95651b" strokeWidth="2" />
          <path d="M75 60 H126" stroke="#fff3ba" strokeWidth="2" opacity=".75" strokeLinecap="round" />
        </g>
      );
    case 'halo':
      return null;
    default:
      return null;
  }
}

function Glasses({ id }: { id: string }): ReactElement | null {
  switch (id) {
    case 'sunglasses':
      return (
        <g className="acc-piece">
          <rect x="62" y="80" width="32" height="21" rx="9" fill="url(#accDarkGlass)" stroke="#141114" strokeWidth="2" />
          <rect x="106" y="80" width="32" height="21" rx="9" fill="url(#accDarkGlass)" stroke="#141114" strokeWidth="2" />
          <path d="M94 87 h12" stroke="#2A2320" strokeWidth="4" strokeLinecap="round" />
          <path d="M62 84 l-10 -4 M138 84 l10 -4" stroke="#2A2320" strokeWidth="3" strokeLinecap="round" />
          <path d="M68 85 q6 -3 12 0 M112 85 q6 -3 12 0" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".36" />
        </g>
      );
    case 'round':
      return (
        <g className="acc-piece" fill="rgba(210,239,255,.22)" stroke="url(#accGold)" strokeWidth="4">
          <circle cx="80" cy="90" r="13" /><circle cx="120" cy="90" r="13" />
          <path d="M93 90 h14" strokeWidth="3.5" /><path d="M67 88 l-12 -4 M133 88 l12 -4" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'star':
      return (
        <g className="acc-piece" fill="url(#accGold)" stroke="#9c7119" strokeWidth="1.5">
          <path d="M80 78 l3.2 6.5 l7.2 .8 l-5.4 4.9 l1.6 7.1 l-6.2 -3.7 l-6.2 3.7 l1.6 -7.1 l-5.4 -4.9 l7.2 -.8z" />
          <path d="M120 78 l3.2 6.5 l7.2 .8 l-5.4 4.9 l1.6 7.1 l-6.2 -3.7 l-6.2 3.7 l1.6 -7.1 l-5.4 -4.9 l7.2 -.8z" />
          <path d="M92 88 h16" stroke="#DCAF2E" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'monocle':
      return (
        <g className="acc-piece">
          <circle cx="120" cy="90" r="13" fill="rgba(210,239,255,.22)" stroke="url(#accGold)" strokeWidth="4" />
          <path d="M113 84 Q119 80 125 83" fill="none" stroke="#fff" strokeWidth="2" opacity=".65" strokeLinecap="round" />
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
        <g className="acc-piece">
          <path d="M66 124 q34 20 68 0 l0 13 q-34 18 -68 0 z" fill="url(#accBlueCloth)" stroke="#365f91" strokeWidth="2" />
          <path d="M122 134 l16 34 l-13 4 l-11 -30 z" fill="url(#accBlueCloth)" stroke="#365f91" strokeWidth="2" />
          <path d="M66 124 q34 20 68 0" fill="none" stroke="#7AA6DD" strokeWidth="2" opacity="0.6" />
        </g>
      );
    case 'bowtie':
      return (
        <g className="acc-piece" transform="translate(100 132)">
          <path d="M0 0 L-20 -11 Q-26 0 -20 11 Z" fill="#B3261E" />
          <path d="M0 0 L20 -11 Q26 0 20 11 Z" fill="#B3261E" />
          <rect x="-5" y="-7" width="10" height="14" rx="3" fill="url(#accRed)" stroke="#7e1814" strokeWidth="1.5" />
        </g>
      );
    case 'necklace':
      return (
        <g className="acc-piece">
          <path d="M72 126 q28 26 56 0" fill="none" stroke="#E7C86B" strokeWidth="2.5" />
          {[78, 90, 100, 110, 122].map((x, i) => <circle key={x} cx={x} cy={128 + (i === 2 ? 8 : i === 1 || i === 3 ? 5 : 1)} r="2.6" fill="#F5C542" />)}
          <path d="M100 138 l-5 8 l5 5 l5 -5 z" fill="#d55565" stroke="#F5C542" strokeWidth="1.5" />
        </g>
      );
    case 'cape':
      return (
        <g className="acc-piece">
          <path d="M68 118 Q100 132 132 118 L150 176 Q100 190 50 176 Z" fill="url(#accPurpleCloth)" stroke="#513178" strokeWidth="2" />
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
  default: gumiGold, cream: gumiCream, rose: gumiRose, blue: gumiBlue,
  burgundy: gumiBurgundy, brown: gumiBrown,
  // Outfit IDs saved before the six-colour palette still render safely.
  pink: gumiRose, gray: gumiBrown, mint: gumiCream, gold: gumiGold,
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
  const skinSrc = SKIN[outfit.color] ?? gumiGold;
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
          <linearGradient id="accGold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff2a3" /><stop offset=".42" stopColor="#f5c542" /><stop offset="1" stopColor="#b97914" /></linearGradient>
          <linearGradient id="accGreen" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#82cb8d" /><stop offset=".55" stopColor="#4f9e5d" /><stop offset="1" stopColor="#337844" /></linearGradient>
          <linearGradient id="accPink" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffc0d3" /><stop offset=".55" stopColor="#e7799b" /><stop offset="1" stopColor="#b94169" /></linearGradient>
          <linearGradient id="accRed" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ef8769" /><stop offset=".55" stopColor="#c9603f" /><stop offset="1" stopColor="#8f3428" /></linearGradient>
          <linearGradient id="accGlass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f5fdff" /><stop offset=".4" stopColor="#8ed5ea" /><stop offset="1" stopColor="#3987a5" /></linearGradient>
          <linearGradient id="accDarkGlass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#625968" /><stop offset=".35" stopColor="#29252d" /><stop offset="1" stopColor="#0e0d12" /></linearGradient>
          <linearGradient id="accBlueCloth" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8bb8ef" /><stop offset=".5" stopColor="#5b8ac9" /><stop offset="1" stopColor="#365d92" /></linearGradient>
          <linearGradient id="accPurpleCloth" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ad80db" /><stop offset=".5" stopColor="#7a4db3" /><stop offset="1" stopColor="#4d2d75" /></linearGradient>
        </defs>
        {outfit.background !== 'none' && <Backdrop id={outfit.background} />}
        <ellipse cx="100" cy="210" rx={fit ? 58 : 80} ry="11" fill="rgba(0,0,0,0.06)" />
        <ellipse className="g-shadow" cx="100" cy="208" rx={fit ? 46 : 64} ry="8" />
        <g className="g-actor" key={`${poke}-${eventKey}`}>
          <g className="g-breath">
            {/* Áo choàng phải nằm sau cơ thể; các phụ kiện khác nằm trên sprite. */}
            {outfit.neck === 'cape' && <g className="acc-slot acc-neck acc-behind" transform="translate(-18.2 -7.35) scale(1.095)"><Neck id="cape" /></g>}
            <g className="acc-slot acc-hat acc-behind" transform="translate(-18.2 -7.35) scale(1.095)"><HatBehind id={outfit.hat} /></g>
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
            {outfit.neck !== 'cape' && <g className="acc-slot acc-neck" transform="translate(-18.2 -7.35) scale(1.095)"><Neck id={outfit.neck} /></g>}
            <g className="acc-slot acc-glasses" transform="translate(-18.2 -7.35) scale(1.095)"><Glasses id={outfit.glasses} /></g>
            <g className="acc-slot acc-hat" transform="translate(-18.2 -7.35) scale(1.095)"><Hat id={outfit.hat} /></g>
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
