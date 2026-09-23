import type { SVGProps } from 'react';

/**
 * Bộ icon dạng nét (line) đồng nhất — thay cho emoji để UI tinh tế, "production" hơn.
 * Nét bo tròn, độ dày 1.75, dùng currentColor nên đổi màu theo text. Một số icon có biến thể `filled` (đầy) để báo trạng thái bật.
 */
export type IconName =
  | 'star' | 'flame' | 'medal' | 'heart' | 'paw' | 'volume' | 'volume-off'
  | 'map' | 'trophy' | 'shirt' | 'camera' | 'gamepad' | 'sofa' | 'utensils' | 'leaf'
  | 'chevron-left' | 'chevron-right' | 'arrow-right' | 'logout' | 'sparkle' | 'lock'
  | 'check' | 'bowl' | 'drop' | 'x' | 'clock' | 'play' | 'flag' | 'shield' | 'undo'
  | 'sun' | 'cloud' | 'moon';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 22, filled = false, strokeWidth = 1.75, ...rest }: Props) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor',
    strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true, focusable: false, ...rest,
  };
  const solid = { fill: 'currentColor', stroke: 'currentColor', strokeWidth: 0.6 };

  switch (name) {
    case 'star':
      return <svg {...common} {...(filled ? solid : {})}><path d="M12 3.6l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.98l-5.1 2.68.97-5.68-4.12-4.02 5.7-.83z" /></svg>;
    case 'flame':
      return <svg {...common} {...(filled ? solid : {})}><path d="M12 3c.6 3-1.8 4.2-1.8 6.6 0 1 .7 1.9 1.8 1.9 1.2 0 1.9-1 1.7-2.4 1.4 1 2.3 2.7 2.3 4.5a4 4 0 1 1-8 0c0-3.6 3-5.1 4-10.6z" /></svg>;
    case 'medal':
      return <svg {...common}><path d="M8 3l2.5 5M16 3l-2.5 5" /><circle cx="12" cy="15" r="6" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M12 12.4l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" fill={filled ? 'var(--color-surface)' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth="1.2" /></svg>;
    case 'heart':
      return <svg {...common} {...(filled ? solid : {})}><path d="M12 20.3l-1.4-1.3C6 14.9 3.5 12.6 3.5 9.4 3.5 7 5.4 5.2 7.8 5.2c1.4 0 2.8.7 3.6 1.8l.6.8.6-.8c.8-1.1 2.2-1.8 3.6-1.8 2.4 0 4.3 1.8 4.3 4.2 0 3.2-2.5 5.5-7.1 9.6z" /></svg>;
    case 'paw':
      return <svg {...common} {...solid}><ellipse cx="7" cy="9.5" rx="1.7" ry="2.3" /><ellipse cx="12" cy="8" rx="1.8" ry="2.5" /><ellipse cx="17" cy="9.5" rx="1.7" ry="2.3" /><path d="M12 12c2.6 0 4.6 1.7 4.6 3.8 0 1.7-1.4 2.7-3.1 2.7-.7 0-1-.3-1.5-.3s-.8.3-1.5.3c-1.7 0-3.1-1-3.1-2.7C7.4 13.7 9.4 12 12 12z" /></svg>;
    case 'volume':
      return <svg {...common}><path d="M4 9.5v5h3l4 3.5v-12L7 9.5z" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>;
    case 'volume-off':
      return <svg {...common}><path d="M4 9.5v5h3l4 3.5v-12L7 9.5z" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M16 10l4 4M20 10l-4 4" /></svg>;
    case 'map':
      return <svg {...common}><path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z" /><path d="M9 4v14M15 6v14" /></svg>;
    case 'trophy':
      return <svg {...common}><path d="M7 4h10v4a5 5 0 0 1-10 0z" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 13v3M9 20h6M10 20v-1.5a2 2 0 0 1 4 0V20" /></svg>;
    case 'shirt':
      return <svg {...common}><path d="M9 4l3 2 3-2 4 3-2.5 2.5V20H7.5V9.5L5 7z" {...(filled ? { fill: 'currentColor' } : {})} /></svg>;
    case 'camera':
      return <svg {...common}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" {...(filled ? { fill: 'currentColor' } : {})} /><circle cx="12" cy="13" r="3.2" fill={filled ? 'var(--color-surface)' : 'none'} /></svg>;
    case 'gamepad':
      return <svg {...common}><path d="M8 7h8a5 5 0 0 1 5 5.2c-.1 2-.7 4.3-2.4 4.6-1.4.3-2-.9-2.9-2H8.3c-.9 1.1-1.5 2.3-2.9 2C3.7 16.5 3.1 14.2 3 12.2A5 5 0 0 1 8 7z" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M7 11v3M5.5 12.5h3M15.5 11.5h.01M18 13.5h.01" /></svg>;
    case 'sofa':
      return <svg {...common}><path d="M5 11V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" /><path d="M3.5 12.5a1.8 1.8 0 0 1 1.8 1.8V16h13.4v-1.7a1.8 1.8 0 0 1 3.3 1V18H4.2v.9M5.3 14.3V17M18.7 14.3V17" /></svg>;
    case 'utensils':
      return <svg {...common}><path d="M8 3v7a2 2 0 0 1-4 0V3M6 10v11M16.5 3c-1.4 0-2.5 1.8-2.5 4s1.1 3.5 2.5 3.5V21" /></svg>;
    case 'leaf':
      return <svg {...common}><path d="M5 19C4 11 9 5 19 5c0 10-6 15-14 14z" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M9 15c2-3 5-5 8-6" /></svg>;
    case 'chevron-left':
      return <svg {...common} strokeWidth={2.2}><path d="M14.5 6L9 12l5.5 6" /></svg>;
    case 'chevron-right':
      return <svg {...common} strokeWidth={2.2}><path d="M9.5 6L15 12l-5.5 6" /></svg>;
    case 'arrow-right':
      return <svg {...common}><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
    case 'logout':
      return <svg {...common} strokeWidth={2}><path d="M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" /></svg>;
    case 'sparkle':
      return <svg {...common} {...(filled ? solid : {})}><path d="M12 3c.5 4 1.5 5 5.5 5.5-4 .5-5 1.5-5.5 5.5-.5-4-1.5-5-5.5-5.5 4-.5 5-1.5 5.5-5.5z" /><path d="M18.5 14c.2 1.6.6 2 2.2 2.2-1.6.2-2 .6-2.2 2.2-.2-1.6-.6-2-2.2-2.2 1.6-.2 2-.6 2.2-2.2z" /></svg>;
    case 'lock':
      return <svg {...common}><rect x="5" y="10.5" width="14" height="9" rx="2.2" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>;
    case 'check':
      return <svg {...common} strokeWidth={2.2}><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
    case 'bowl':
      return <svg {...common}><path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M8 7c0-1.2 1-2 2-1.6M12 6.4c0-1.2 1-2 2-1.6" /></svg>;
    case 'drop':
      return <svg {...common} {...(filled ? solid : {})}><path d="M12 3.5c3 4 5.5 6.6 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2.9 2.5-5.5 5.5-9.5z" /></svg>;
    case 'x':
      return <svg {...common} strokeWidth={2.2}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="8.5" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M12 7.5V12l3 2" stroke={filled ? 'var(--color-surface)' : 'currentColor'} /></svg>;
    case 'play':
      return <svg {...common} {...(filled ? solid : {})}><path d="M8 5.5l10 6.5-10 6.5z" /></svg>;
    case 'flag':
      return <svg {...common}><path d="M6 21V4M6 4.5h11l-2 3.5 2 3.5H6" {...(filled ? { fill: 'currentColor' } : {})} /></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 3.2l7 2.6v5c0 4.4-3 7.6-7 9.4-4-1.8-7-5-7-9.4v-5z" {...(filled ? { fill: 'currentColor' } : {})} /><path d="M8.8 12l2.2 2.2 4.2-4.4" stroke={filled ? 'var(--color-surface)' : 'currentColor'} strokeWidth="1.8" /></svg>;
    case 'undo':
      return <svg {...common}><path d="M9 7L4.5 11.5 9 16M5 11.5h9a5 5 0 0 1 0 10h-2" /></svg>;
    case 'sun':
      return <svg {...common} {...(filled ? { fill: 'currentColor' } : {})}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" fill="none" /></svg>;
    case 'cloud':
      return <svg {...common} {...(filled ? { fill: 'currentColor' } : {})}><path d="M7 18h10a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 7.6 9.8 3.6 3.6 0 0 0 7 18z" /></svg>;
    case 'moon':
      return <svg {...common} {...(filled ? { fill: 'currentColor' } : {})}><path d="M20 13.5A8 8 0 1 1 10.5 4a6.3 6.3 0 0 0 9.5 9.5z" /></svg>;
    default:
      return null;
  }
}
