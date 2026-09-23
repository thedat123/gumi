import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

/** Vài bong bóng nổi trong nền game (trang trí). */
function Bubbles() {
  const bubbles = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({
      left: `${8 + i * 13 + (i % 2) * 4}%`,
      size: 14 + (i % 4) * 12,
      dur: 9 + (i % 5) * 2.5,
      delay: -(i * 1.7),
    })),
    [],
  );
  return (
    <>
      {bubbles.map((b, i) => (
        <span key={i} className="game-bubble" style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </>
  );
}

/**
 * Khung nhập vai dùng chung cho mọi minigame: nền động theo vùng đất, thanh trên có nút Thoát + tựa game + HUD (điểm/tiến độ/đồng hồ).
 * Chiếm gần trọn khung nhìn để cảm giác "vào một màn chơi thật", không còn là mấy nút nhỏ.
 */
export function GameShell({ act = 1, title, intro, hud, footer, children }: {
  act?: 1 | 2 | 3; title: string; intro?: string; hud?: ReactNode; footer?: ReactNode; children: ReactNode;
}) {
  return (
    <div className={`game-shell act-${act} relative -mx-4 -mt-1 flex min-h-[calc(100dvh-4.75rem)] flex-col overflow-hidden px-4 pb-4 pt-3 sm:mx-auto sm:my-3 sm:min-h-[calc(100dvh-7.5rem)] sm:max-w-md sm:rounded-[28px] sm:border sm:border-white/60 sm:px-5 sm:shadow-pop`}>
      <div className="game-bg" aria-hidden="true"><Bubbles /></div>
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="mb-3 flex items-center gap-3">
          <Link to="/" aria-label="Thoát" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-border bg-surface/85 text-muted shadow-soft backdrop-blur transition-transform active:scale-90">
            <Icon name="x" size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-title font-extrabold leading-tight">{title}</h1>
            {intro && <p className="truncate text-caption font-medium text-muted">{intro}</p>}
          </div>
          {hud}
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Chip HUD nhỏ (điểm/tiến độ) cho thanh trên của game. */
export function GameStat({ icon, value, tone = 'primary' }: { icon: Parameters<typeof Icon>[0]['name']; value: string; tone?: 'primary' | 'accent' | 'info' | 'success' }) {
  const tint = { primary: 'text-primary', accent: 'text-accent', info: 'text-info', success: 'text-success' }[tone];
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-surface/90 px-3 py-1.5 text-small font-bold shadow-soft backdrop-blur">
      <Icon name={icon} size={16} filled className={tint} />{value}
    </span>
  );
}

const CONFETTI_COLORS = ['#B83556', '#EF9F2A', '#1F7A4D', '#55768C', '#DC97A5', '#F5C542'];

/** Mưa confetti khi thắng. Đổi `fire` (số) để bắn lại. */
export function Confetti({ fire = 0, count = 90 }: { fire?: number; count?: number }) {
  const [pieces, setPieces] = useState<number>(0);
  useEffect(() => { if (fire > 0) setPieces((n) => n + 1); }, [fire]);
  if (pieces === 0) return null;
  const reduce = typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm'));
  if (reduce) return null;
  return (
    <div key={pieces} className="confetti-layer" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.35;
        const dur = 1.6 + Math.random() * 1.4;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const w = 7 + Math.random() * 7;
        return <span key={i} className="confetti" style={{ left: `${left}%`, width: w, height: w * 1.4, background: color, animationDuration: `${dur}s`, animationDelay: `${delay}s`, borderRadius: i % 3 === 0 ? '50%' : '2px' }} />;
      })}
    </div>
  );
}
